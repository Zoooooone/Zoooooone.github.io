import type { Database, Env } from './types';

// Charts are shown in Tokyo time. The offset is a literal in the SQL, never user input.
const TZ_OFFSET_S = 9 * 3600;
const DAY_MS = 24 * 60 * 60 * 1000;
const TOP = 10;

interface Filters {
  since: number;
  bots: boolean;
}

type ResponseHeaders = Record<string, string>;

const json = (data: unknown, headers: ResponseHeaders) =>
  new Response(JSON.stringify(data), {
    headers: { ...headers, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

// Compare digests so the check takes the same time wherever the first wrong character is.
async function tokenMatches(given: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all(
    [given, expected].map(
      async (value) => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))),
    ),
  );
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function integer(value: string | null, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return value !== null && Number.isInteger(n) ? Math.min(Math.max(n, min), max) : fallback;
}

const hostOf = (referrer: string): string => {
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

async function summary(db: Database, { since, bots }: Filters) {
  const where = bots ? 'ts >= ?' : 'ts >= ? AND is_bot = 0';
  const local = `(ts / 1000 + ${TZ_OFFSET_S})`;
  const rows = async <T>(sql: string) => (await db.prepare(sql).bind(since).all<T>()).results;

  const breakdown = (column: 'country' | 'browser' | 'os' | 'device') =>
    rows<{ name: string; views: number; visitors: number }>(
      `SELECT ${column} AS name, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
       FROM visits WHERE ${where} AND ${column} != '' GROUP BY ${column} ORDER BY views DESC LIMIT ${TOP}`,
    );

  const [totals, people, daily, heatmap, pages, referrers, countries, cities, browsers, systems, devices] =
    await Promise.all([
      rows<{ views: number; visitors: number; avg_ms: number | null }>(
        `SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors, AVG(duration_ms) AS avg_ms
         FROM visits WHERE ${where}`,
      ),
      db
        .prepare(
          `SELECT COALESCE(SUM(first_seen >= ?), 0) AS new_visitors FROM visitors
           WHERE id IN (SELECT visitor_id FROM visits WHERE ${where})`,
        )
        .bind(since, since)
        .all<{ new_visitors: number }>()
        .then((r) => r.results),
      rows<{ day: string; views: number; visitors: number }>(
        `SELECT strftime('%Y-%m-%d', ${local}, 'unixepoch') AS day, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
         FROM visits WHERE ${where} GROUP BY day ORDER BY day`,
      ),
      rows<{ dow: number; hour: number; views: number }>(
        `SELECT CAST(strftime('%w', ${local}, 'unixepoch') AS INTEGER) AS dow,
                CAST(strftime('%H', ${local}, 'unixepoch') AS INTEGER) AS hour, COUNT(*) AS views
         FROM visits WHERE ${where} GROUP BY dow, hour`,
      ),
      rows<{ path: string; views: number; visitors: number; avg_ms: number | null }>(
        `SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors, AVG(duration_ms) AS avg_ms
         FROM visits WHERE ${where} GROUP BY path ORDER BY views DESC LIMIT 15`,
      ),
      rows<{ referrer: string; views: number }>(
        `SELECT referrer, COUNT(*) AS views FROM visits WHERE ${where} GROUP BY referrer ORDER BY views DESC LIMIT 300`,
      ),
      breakdown('country'),
      rows<{ country: string; city: string; views: number; visitors: number }>(
        `SELECT country, city, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
         FROM visits WHERE ${where} AND city != '' GROUP BY country, city ORDER BY views DESC LIMIT ${TOP}`,
      ),
      breakdown('browser'),
      breakdown('os'),
      breakdown('device'),
    ]);

  // A path as referrer is a click from another page of this site, which says nothing about where readers come from.
  const sources = { direct: 0, internal: 0, external: new Map<string, number>() };
  for (const { referrer, views } of referrers) {
    if (!referrer) sources.direct += views;
    else if (referrer.startsWith('/')) sources.internal += views;
    else {
      const host = hostOf(referrer);
      if (host) sources.external.set(host, (sources.external.get(host) ?? 0) + views);
    }
  }

  const { views, visitors, avg_ms } = totals[0];
  const newVisitors = people[0].new_visitors;
  return {
    totals: {
      views,
      visitors,
      newVisitors,
      returningVisitors: visitors - newVisitors,
      avgDurationMs: avg_ms === null ? null : Math.round(avg_ms),
    },
    daily,
    heatmap,
    pages: pages.map((p) => ({ ...p, avg_ms: p.avg_ms === null ? null : Math.round(p.avg_ms) })),
    referrers: {
      direct: sources.direct,
      internal: sources.internal,
      external: [...sources.external]
        .map(([host, count]) => ({ host, views: count }))
        .sort((a, b) => b.views - a.views)
        .slice(0, TOP),
    },
    countries,
    cities,
    browsers,
    systems,
    devices,
  };
}

async function visits(
  db: Database,
  { since, bots }: Filters,
  params: URLSearchParams,
  headers: ResponseHeaders,
): Promise<Response | object> {
  const invalid = () => new Response(null, { status: 400, headers });
  const conditions = ['v.ts >= ?'];
  const values: unknown[] = [since];
  if (!bots) conditions.push('v.is_bot = 0');

  const before = params.get('before');
  if (before !== null) {
    conditions.push('v.ts < ?');
    values.push(integer(before, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER));
  }

  const path = params.get('path');
  if (path !== null) {
    if (!/^\/[\w\-./%~]*$/.test(path)) return invalid();
    conditions.push('v.path = ?');
    values.push(path);
  }
  const country = params.get('country');
  if (country !== null) {
    if (!/^[A-Z]{2}$/.test(country)) return invalid();
    conditions.push('v.country = ?');
    values.push(country);
  }
  const visitor = params.get('visitor');
  if (visitor !== null) {
    if (!/^[0-9a-f]{32}$/.test(visitor)) return invalid();
    conditions.push('v.visitor_id = ?');
    values.push(visitor);
  }

  const firstOfVisitor = '(v.ts = (SELECT MIN(ts) FROM visits WHERE visitor_id = v.visitor_id))';
  if (params.get('first') === '1') conditions.push(firstOfVisitor);

  const limit = integer(params.get('limit'), 1, 100, 50);
  const { results } = await db
    .prepare(
      `SELECT v.visitor_id, v.ts, v.path, v.referrer, v.country, v.region, v.city, v.as_org, v.browser, v.os, v.device,
              v.screen, v.lang, v.is_bot, v.duration_ms, ${firstOfVisitor} AS is_first
       FROM visits v WHERE ${conditions.join(' AND ')} ORDER BY v.ts DESC LIMIT ?`,
    )
    .bind(...values, limit + 1)
    .all<Record<string, unknown> & { ts: number; is_bot: number; is_first: number }>();

  const page = results.slice(0, limit);
  return {
    visits: page.map((row) => ({ ...row, is_bot: row.is_bot === 1, is_first: row.is_first === 1 })),
    next: results.length > limit ? page[page.length - 1].ts : null,
  };
}

export async function handleStats(request: Request, env: Env, headers: ResponseHeaders): Promise<Response> {
  if (!env.STATS_TOKEN) return new Response(null, { status: 404, headers });

  const bearer = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '');
  if (!bearer || !(await tokenMatches(bearer[1], env.STATS_TOKEN))) {
    return new Response(null, { status: 401, headers });
  }

  const url = new URL(request.url);
  const days = integer(url.searchParams.get('days'), 0, 3650, 30);
  const filters = { since: days ? Date.now() - days * DAY_MS : 0, bots: url.searchParams.get('bots') === '1' };

  if (url.pathname === '/api/summary') return json({ days, ...(await summary(env.DB, filters)) }, headers);
  if (url.pathname === '/api/visits') {
    const result = await visits(env.DB, filters, url.searchParams, headers);
    return result instanceof Response ? result : json(result, headers);
  }
  return new Response(null, { status: 404, headers });
}
