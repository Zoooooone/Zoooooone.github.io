# Visit tracking Worker

Receives anonymous page-view reports from the blog and stores them in Cloudflare D1. Cloudflare supplies the country, region, city and network (ASN) of each request; the raw IP is never stored, only a hash that changes every day.

## Deploy

Run from this folder (`worker/`):

```bash
npx wrangler login
npx wrangler d1 create blog-visits
```

Copy the printed `database_id` into `wrangler.toml`, then:

```bash
npx wrangler d1 execute blog-visits --remote --file=schema.sql
npx wrangler secret put HASH_SECRET
npx wrangler deploy
```

`wrangler deploy` prints the Worker URL. Put it in `analytics.endpoint` in `src/config/site.ts` and publish the blog.

## Look at the data

```bash
npx wrangler d1 execute blog-visits --remote --command "SELECT datetime(ts/1000,'unixepoch') AS at, path, country, city, browser, os, is_bot FROM visits ORDER BY ts DESC LIMIT 20"
```

## Protection against fake data

The endpoint is public, so anyone can send requests to it. The Worker limits the damage:

- Only requests with the blog's `Origin` are accepted (easy to forge from a script, so this only stops casual misuse).
- At most 20 page views per visitor id and 60 per network (hashed IP) per minute; the rest get `429` and are not stored.
- Every field must look like what a browser sends; anything else is blanked or rejected.
- Visit times come from the server clock and the time on page is capped at one hour.

If junk gets in anyway, find where it comes from and delete it:

```bash
npx wrangler d1 execute blog-visits --remote --command "SELECT ip_hash, COUNT(*) AS n FROM visits WHERE ts > strftime('%s','now','-1 day')*1000 GROUP BY ip_hash ORDER BY n DESC LIMIT 10"
npx wrangler d1 execute blog-visits --remote --command "DELETE FROM visits WHERE ip_hash = '<hash from above>'"
npx wrangler d1 execute blog-visits --remote --command "DELETE FROM visitors WHERE id NOT IN (SELECT visitor_id FROM visits)"
```

The IP hash changes every day, so a hash only identifies one source within a single day.

After changing `schema.sql`, run it again (it only creates what is missing):

```bash
npx wrangler d1 execute blog-visits --remote --file=schema.sql
```
