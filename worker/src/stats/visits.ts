import type { Database } from '../types';
import { integer, type Filters, type ResponseHeaders } from './shared';

const FILTERS: [param: string, pattern: RegExp, column: string][] = [
  ['path', /^\/[\w\-./%~]*$/, 'v.path'],
  ['country', /^[A-Z]{2}$/, 'v.country'],
  ['visitor', /^[0-9a-f]{32}$/, 'v.visitor_id'],
];

const firstOfVisitor = '(v.ts = (SELECT MIN(ts) FROM visits WHERE visitor_id = v.visitor_id))';

const bool = (value: number | null) => (value === null ? null : value === 1);

export async function visits(
  db: Database,
  { since, bots }: Filters,
  params: URLSearchParams,
  headers: ResponseHeaders,
): Promise<Response | object> {
  const conditions = ['v.ts >= ?'];
  const values: unknown[] = [since];
  if (!bots) conditions.push('v.is_bot = 0');

  const before = params.get('before');
  if (before !== null) {
    conditions.push('v.ts < ?');
    values.push(integer(before, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER));
  }

  for (const [param, pattern, column] of FILTERS) {
    const value = params.get(param);
    if (value === null) continue;
    if (!pattern.test(value)) return new Response(null, { status: 400, headers });
    conditions.push(`${column} = ?`);
    values.push(value);
  }

  if (params.get('first') === '1') conditions.push(firstOfVisitor);

  const limit = integer(params.get('limit'), 1, 100, 50);
  const { results } = await db
    .prepare(
      `SELECT v.visitor_id, v.ts, v.path, v.referrer, v.country, v.region, v.city, v.asn, v.as_org, v.tz, v.browser, v.os,
              v.device, v.screen, v.viewport, v.dpr, v.touch, v.lang, v.nav, v.utm_source, v.utm_medium, v.utm_campaign,
              v.ua, v.is_bot, v.automation, v.interacted, v.scroll_pct, v.duration_ms, ${firstOfVisitor} AS is_first
       FROM visits v WHERE ${conditions.join(' AND ')} ORDER BY v.ts DESC LIMIT ?`,
    )
    .bind(...values, limit + 1)
    .all<
      Record<string, unknown> & {
        ts: number;
        is_bot: number;
        is_first: number;
        automation: number | null;
        interacted: number | null;
      }
    >();

  const page = results.slice(0, limit);
  return {
    visits: page.map((row) => ({
      ...row,
      is_bot: row.is_bot === 1,
      is_first: row.is_first === 1,
      automation: bool(row.automation),
      interacted: bool(row.interacted),
    })),
    next: results.length > limit ? page[page.length - 1].ts : null,
  };
}
