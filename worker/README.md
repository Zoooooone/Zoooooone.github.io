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

## Stats API

Read-only endpoints for the stats page. They only exist when the `STATS_TOKEN` secret is set, and every request needs the blog's `Origin` and `Authorization: Bearer <token>`.

```bash
npx wrangler secret put STATS_TOKEN
```

Use a long random value (40+ characters) and change it the same way if it ever leaks.

| Endpoint                                           | Returns                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `GET /api/summary?days=30&bots=0`                  | Totals, new vs returning visitors, daily series, weekday×hour heatmap, top pages, sources, places, devices      |
| `GET /api/visits?days=30&bots=0&limit=50&before=ts` | Newest visits first, with `next` as the cursor for the following page                                           |

`/api/visits` also takes `path=`, `country=`, `visitor=` (all time with `days=0`) and `first=1` (only each visitor's first visit). `days=0` means everything. Times are grouped in Tokyo time. The IP hash is never returned.

Each summary request reads every visit in the range several times, so keep an eye on the daily D1 read allowance once the table grows into the hundreds of thousands of rows.
