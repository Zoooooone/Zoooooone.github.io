import { parseAgent } from './ua';

// Just the part of the D1 API used here, so the Worker needs no Cloudflare typings and tests can fake it.
interface Statement {
  bind(...values: unknown[]): Statement;
  run(): Promise<unknown>;
}
interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown>;
}

export interface Env {
  DB: Database;
  /** Comma-separated list of origins allowed to report, e.g. https://zoooooone.github.io */
  ALLOWED_ORIGINS: string;
  /** Secret mixed into the daily IP hash. */
  HASH_SECRET: string;
}

interface Geo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  asn?: number;
  asOrganization?: string;
}

const MAX_BODY = 2048;
const MAX_VISIBLE_MS = 60 * 60 * 1000;

const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.slice(0, max) : '');
const isId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);

export async function hashIp(ip: string, secret: string, day: string): Promise<string> {
  const data = new TextEncoder().encode(`${secret}|${day}|${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function cors(origin: string): HeadersInit {
  return { 'access-control-allow-origin': origin, vary: 'origin' };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin') ?? '';
    const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    // sendBeacon always sends an Origin header, so a missing or foreign one is not our site.
    if (!allowed.includes(origin)) return new Response(null, { status: 403 });

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors(origin),
          'access-control-allow-methods': 'POST',
          'access-control-allow-headers': 'content-type',
        },
      });
    }
    if (request.method !== 'POST') return new Response(null, { status: 405 });

    const raw = await request.text();
    if (raw.length > MAX_BODY) return new Response(null, { status: 413 });

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return new Response(null, { status: 400 });
    }
    if (!isId(body.visitor) || !isId(body.pv)) return new Response(null, { status: 400 });

    const now = Date.now();
    const ok = new Response(null, { status: 204, headers: cors(origin) });

    if (body.type === 'leave') {
      const ms = Math.min(Math.max(Number(body.ms) || 0, 0), MAX_VISIBLE_MS);
      await env.DB.prepare(
        'UPDATE visits SET duration_ms = MAX(COALESCE(duration_ms, 0), ?) WHERE pv = ? AND visitor_id = ?',
      )
        .bind(ms, body.pv, body.visitor)
        .run();
      return ok;
    }
    if (body.type !== 'hit') return new Response(null, { status: 400 });

    const path = text(body.path, 300);
    if (!path.startsWith('/')) return new Response(null, { status: 400 });

    const agent = parseAgent(request.headers.get('user-agent') ?? '');
    const geo = ((request as { cf?: Geo }).cf ?? {}) as Geo;
    const ip = request.headers.get('cf-connecting-ip') ?? '';
    const day = new Date(now).toISOString().slice(0, 10);
    const ipHash = ip ? await hashIp(ip, env.HASH_SECRET, day) : '';

    await env.DB.batch([
      env.DB.prepare(
        `INSERT OR IGNORE INTO visits
          (pv, visitor_id, ts, path, referrer, country, region, city, asn, as_org, tz, browser, os, device, screen, lang, is_bot, ip_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        body.pv,
        body.visitor,
        now,
        path,
        text(body.referrer, 300),
        geo.country ?? '',
        geo.region ?? '',
        geo.city ?? '',
        geo.asn ?? 0,
        geo.asOrganization ?? '',
        text(body.tz, 64) || geo.timezone || '',
        agent.browser,
        agent.os,
        agent.device,
        text(body.screen, 16),
        text(body.lang, 16),
        agent.bot ? 1 : 0,
        ipHash,
      ),
      env.DB.prepare(
        `INSERT INTO visitors (id, first_seen, last_seen, visits) VALUES (?, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET last_seen = excluded.last_seen, visits = visits + 1`,
      ).bind(body.visitor, now, now),
    ]);
    return ok;
  },
};
