# Visit tracking Worker

Receives anonymous page-view reports from the blog and stores them in Cloudflare D1. Cloudflare supplies the country, region, city and network (ASN) of each request; the raw IP is never stored, only a hash that changes every day.

## What is collected

| Where from | Fields |
| --- | --- |
| Cloudflare, per request | country, region, city, network name and number, time zone (when the browser did not send one) |
| Request header | the browser identifier (`ua`, at most 300 characters) and what is read from it: browser, system, device type, whether it looks like a known crawler |
| Browser, with the page view | path, referrer (path only, no query), screen size, window size, pixel ratio, touch points, language, time zone, how the page was opened (`nav`), the three `utm_*` campaign tags, whether the browser looks automated |
| Browser, when the visitor leaves | time on page, whether a real click or key press happened, how far down the page the window got (0 to 100) |

The rest of the address (query string, fragment) is never sent, only the three campaign tags. A visit from before a field existed keeps `NULL` (or an empty string) for it, which means "not measured", not "no".

Fingerprinting techniques (canvas, audio, fonts, graphics card, CPU and memory) are deliberately not used.

## Deploy

Run from this folder (`worker/`):

```bash
npx wrangler login
npx wrangler d1 create blog-visits
```

Copy the printed `database_id` into `wrangler.toml`, then:

```bash
npx wrangler d1 migrations apply blog-visits --remote
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

## Changing the database

The tables are described by the files in `migrations/`, applied in order. To add a column, add the next numbered file instead of editing an old one, then apply it before deploying the Worker that needs it:

```bash
npx wrangler d1 migrations apply blog-visits --remote
```

Wrangler remembers which files it has applied, so running the command again does nothing. The first file only creates what is missing, so it is safe on a database that was set up before migrations were used.

## Stats API

Read-only endpoints for the stats page. They only exist when the `STATS_TOKEN` secret is set, and every request needs the blog's `Origin` and `Authorization: Bearer <token>`.

```bash
npx wrangler secret put STATS_TOKEN
```

Use a long random value (40+ characters) and change it the same way if it ever leaks.

| Endpoint                                           | Returns                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `GET /api/summary?days=30&bots=0`                  | Totals, new vs returning visitors, daily series, weekday×hour heatmap, top pages, sources and campaign tags, places and networks, devices, screens, languages, scroll depth and the browser signals |
| `GET /api/visits?days=30&bots=0&limit=50&before=ts` | Newest visits first, with `next` as the cursor for the following page                                           |

`/api/visits` also takes `path=`, `country=`, `visitor=` (all time with `days=0`) and `first=1` (only each visitor's first visit). `days=0` means everything. Times are grouped in Tokyo time. The IP hash is never returned.

Each summary request reads every visit in the range several times, so keep an eye on the daily D1 read allowance once the table grows into the hundreds of thousands of rows.

## Model snapshots

The same Worker keeps a daily copy of the [Artificial Analysis](https://artificialanalysis.ai/) free API for the private `/model-watch/` page: the LLM list and the five media arenas (text to image, image editing, text to speech, text to video, image to video).

```bash
npx wrangler secret put AA_API_KEY
npx wrangler d1 migrations apply blog-visits --remote
npx wrangler deploy
```

- A cron trigger runs every hour. From 06:00 Tokyo time it fetches each board that has no snapshot for today yet, so a failed board is retried the next hour and a finished day costs no further requests (six a day, the limit is 1000).
- Days are Tokyo dates. A price or speed of `0` from the API means "not measured" and is stored as `NULL`.
- A response that is not JSON, lists no models, or has less than half the models of the previous snapshot is refused and logged in `aa_runs`; the page keeps showing the last good day.
- The response is handed to SQLite as one value and taken apart there with `json_each`, so the Worker never parses the 0.6 MB list. D1 refuses values over 2 MB.

| Endpoint                          | Returns                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `GET /api/models/latest`          | Newest list of every board, the latest fetch attempts, and the best intelligence index per day |
| `GET /api/models/changes?days=7&metric=intelligence` | Models added, removed, rescored or repriced since the snapshot `days` earlier, and rank changes in each arena. `metric` is the column or benchmark that "rescored" compares; an unknown name gets `400` |
| `GET /api/models/history?id=`     | Every stored day of one LLM                                                      |

They use the same `Origin` and `STATS_TOKEN` checks as the stats API.

Terms: the data is licensed by the Artificial Analysis [Data Platform Terms](https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf) for internal use. Keep the page behind the token, never commit API responses (tests and `pnpm dev:mock` use invented models), and keep the attribution on the page. If the API access ends, delete the `aa_*` tables within 30 days.

A deployed Worker has no button to run its cron on demand. After deploying, wait for the next full hour (watch it with `npx wrangler tail --format pretty`), then check the log:

```bash
npx wrangler d1 execute blog-visits --remote --command "SELECT datetime(ts/1000,'unixepoch') AS at, board, ok, models, error FROM aa_runs ORDER BY ts DESC LIMIT 12"
```
