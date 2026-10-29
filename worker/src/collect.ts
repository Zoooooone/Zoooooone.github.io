import type { Env } from './types';
import { judge } from './suspect';
import { parseAgent } from './ua';
import {
  CAMPAIGN,
  LANG,
  NAV_TYPES,
  PATH,
  PIXEL_RATIO,
  REFERRER,
  SCREEN,
  TIMEZONE,
  VIEWPORT,
  flag,
  isId,
  matching,
  whole,
} from './validate';

interface Geo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  asn?: number;
  asOrganization?: string;
}

type Report = Record<string, unknown> & { visitor: string; pv: string };

const MAX_BODY = 2048;
const MAX_VISIBLE_MS = 60 * 60 * 1000;
const WINDOW_MS = 60 * 1000;
const MAX_HITS_PER_IP = 60;
const MAX_HITS_PER_VISITOR = 20;

export async function hashIp(ip: string, secret: string, day: string): Promise<string> {
  const data = new TextEncoder().encode(`${secret}|${day}|${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function recordLeave(env: Env, body: Report): Promise<number> {
  const ms = Math.min(Math.max(Number(body.ms) || 0, 0), MAX_VISIBLE_MS);
  const scroll = whole(body.scroll, 100);
  const interacted = flag(body.interacted);
  // Reported more than once while the tab goes in and out of view, so each value only ever grows.
  await env.DB.prepare(
    `UPDATE visits SET
       duration_ms = MAX(COALESCE(duration_ms, 0), ?),
       scroll_pct = CASE WHEN ? IS NULL THEN scroll_pct ELSE MAX(COALESCE(scroll_pct, 0), ?) END,
       interacted = CASE WHEN ? IS NULL THEN interacted ELSE MAX(COALESCE(interacted, 0), ?) END
     WHERE pv = ? AND visitor_id = ?`,
  )
    .bind(ms, scroll, scroll, interacted, interacted, body.pv, body.visitor)
    .run();
  return 204;
}

async function recordHit(request: Request, env: Env, body: Report): Promise<number> {
  const now = Date.now();
  const path = matching(body.path, PATH, 300);
  if (!path) return 400;

  const userAgent = [...(request.headers.get('user-agent') ?? '')]
    .filter((c) => c.charCodeAt(0) > 31 && c.charCodeAt(0) !== 127)
    .join('')
    .slice(0, 300);
  const agent = parseAgent(userAgent);
  const geo = ((request as { cf?: Geo }).cf ?? {}) as Geo;
  const ip = request.headers.get('cf-connecting-ip') ?? '';
  const day = new Date(now).toISOString().slice(0, 10);
  const ipHash = ip ? await hashIp(ip, env.HASH_SECRET, day) : '';
  const referrer = matching(body.referrer, REFERRER, 300);
  const screen = matching(body.screen, SCREEN, 11);
  const viewport = matching(body.viewport, VIEWPORT, 11);
  const tz = matching(body.tz, TIMEZONE, 64);
  const automation = flag(body.automation);
  const verdict = judge({
    automation,
    screen,
    viewport,
    lang: matching(body.lang, LANG, 20),
    referrer,
    tz,
    ipTz: geo.timezone ?? '',
    asOrg: geo.asOrganization ?? '',
  });

  const recent = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM visits WHERE ip_hash = ? AND ts > ?) AS by_ip,
            (SELECT COUNT(*) FROM visits WHERE visitor_id = ? AND ts > ?) AS by_visitor`,
  )
    .bind(ipHash || null, now - WINDOW_MS, body.visitor, now - WINDOW_MS)
    .first<{ by_ip: number; by_visitor: number }>();
  if ((recent?.by_ip ?? 0) >= MAX_HITS_PER_IP || (recent?.by_visitor ?? 0) >= MAX_HITS_PER_VISITOR) return 429;

  const row = {
    pv: body.pv,
    visitor_id: body.visitor,
    ts: now,
    path,
    referrer,
    country: geo.country ?? '',
    region: geo.region ?? '',
    city: geo.city ?? '',
    asn: geo.asn ?? 0,
    as_org: geo.asOrganization ?? '',
    tz: tz || geo.timezone || '',
    browser: agent.browser,
    os: agent.os,
    device: agent.device,
    screen,
    lang: matching(body.lang, LANG, 20),
    is_bot: agent.bot || verdict.bot ? 1 : 0,
    suspect: verdict.suspect ? 1 : 0,
    ip_hash: ipHash,
    viewport,
    dpr: matching(body.dpr, PIXEL_RATIO, 5),
    touch: whole(body.touch, 20),
    nav: NAV_TYPES.includes(body.nav as string) ? (body.nav as string) : '',
    utm_source: matching(body.utm_source, CAMPAIGN, 64),
    utm_medium: matching(body.utm_medium, CAMPAIGN, 64),
    utm_campaign: matching(body.utm_campaign, CAMPAIGN, 64),
    automation,
    ua: userAgent,
  };
  const columns = Object.keys(row);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO visitors (id, first_seen, last_seen, visits)
       SELECT ?, ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM visits WHERE pv = ?)
       ON CONFLICT(id) DO UPDATE SET last_seen = excluded.last_seen, visits = visits + 1`,
    ).bind(body.visitor, now, now, body.pv),
    env.DB.prepare(
      `INSERT OR IGNORE INTO visits (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    ).bind(...Object.values(row)),
  ]);
  return 204;
}

/** Reads one report from the browser and stores it; the result is the HTTP status to answer with. */
export async function collect(request: Request, env: Env): Promise<number> {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return 413;

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return 400;
  }
  if (!isId(body.visitor) || !isId(body.pv)) return 400;

  const report = body as Report;
  if (report.type === 'leave') return recordLeave(env, report);
  if (report.type === 'hit') return recordHit(request, env, report);
  return 400;
}
