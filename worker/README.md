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
