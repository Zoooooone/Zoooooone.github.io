import { describe, expect, it } from 'vitest';
import worker, { hashIp, type Env } from '../../worker/src/index';
import { parseAgent } from '../../worker/src/ua';

const ORIGIN = 'https://site.test';
const ID = 'a'.repeat(32);
const PV = 'b'.repeat(32);

type Fake = { bind: (...v: unknown[]) => Fake; run: () => Promise<void>; sql: string; values: unknown[] };

function setup() {
  const runs: { sql: string; values: unknown[] }[] = [];
  const statement = (sql: string, values: unknown[] = []): Fake => ({
    bind: (...v) => statement(sql, v),
    run: async () => void runs.push({ sql, values }),
    sql,
    values,
  });
  const env: Env = {
    ALLOWED_ORIGINS: ORIGIN,
    HASH_SECRET: 's',
    DB: {
      prepare: (sql) => statement(sql),
      batch: async (list) => {
        for (const item of list as Fake[]) runs.push({ sql: item.sql, values: item.values });
      },
    },
  };
  return { env, runs };
}

function post(body: unknown, init: { origin?: string; ua?: string } = {}) {
  return new Request('https://worker.test/e', {
    method: 'POST',
    headers: {
      origin: init.origin ?? ORIGIN,
      'user-agent': init.ua ?? 'Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36',
      'cf-connecting-ip': '203.0.113.9',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('worker', () => {
  it('rejects other origins', async () => {
    const { env, runs } = setup();
    const res = await worker.fetch(post({}, { origin: 'https://evil.test' }), env);
    expect(res.status).toBe(403);
    expect(runs).toHaveLength(0);
  });

  it('answers the CORS preflight', async () => {
    const { env } = setup();
    const res = await worker.fetch(
      new Request('https://worker.test/e', { method: 'OPTIONS', headers: { origin: ORIGIN } }),
      env,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });

  it('stores a hit and bumps the visitor, without the raw IP', async () => {
    const { env, runs } = setup();
    const res = await worker.fetch(
      post({ type: 'hit', pv: PV, visitor: ID, path: '/posts/x/', referrer: '', tz: 'Asia/Tokyo' }),
      env,
    );
    expect(res.status).toBe(204);
    expect(runs).toHaveLength(2);
    expect(runs[0].sql).toContain('INTO visits');
    expect(runs[1].sql).toContain('INTO visitors');
    expect(JSON.stringify(runs[0].values)).not.toContain('203.0.113.9');
    expect(runs[0].values).toContain('Chrome');
    expect(runs[0].values).toContain('Windows');
  });

  it('records time on page for a leave report, capped at one hour and never lowered', async () => {
    const { env, runs } = setup();
    await worker.fetch(post({ type: 'leave', pv: PV, visitor: ID, ms: 99_999_999 }), env);
    expect(runs[0].values).toEqual([3_600_000, PV, ID]);
    expect(runs[0].sql).toContain('MAX(COALESCE(duration_ms, 0), ?)');
  });

  it.each([
    ['malformed JSON', '{nope'],
    ['a bad visitor id', { type: 'hit', pv: PV, visitor: 'x', path: '/' }],
    ['a path that is not absolute', { type: 'hit', pv: PV, visitor: ID, path: 'https://x' }],
    ['an unknown type', { type: 'other', pv: PV, visitor: ID }],
  ])('rejects %s', async (_name, body) => {
    const { env, runs } = setup();
    const res = await worker.fetch(post(body), env);
    expect(res.status).toBe(400);
    expect(runs).toHaveLength(0);
  });

  it('rejects an oversized body', async () => {
    const { env } = setup();
    const res = await worker.fetch(post('x'.repeat(5000)), env);
    expect(res.status).toBe(413);
  });
});

describe('hashIp', () => {
  it('is stable within a day and differs across days', async () => {
    const a = await hashIp('1.2.3.4', 's', '2026-10-21');
    expect(a).toBe(await hashIp('1.2.3.4', 's', '2026-10-21'));
    expect(a).not.toBe(await hashIp('1.2.3.4', 's', '2026-10-22'));
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('parseAgent', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit Chrome/120 Edg/120 Safari/537', 'Edge', 'Windows', 'desktop', false],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17) AppleWebKit Version/17 Mobile Safari/604',
      'Safari',
      'iOS',
      'mobile',
      false,
    ],
    ['Mozilla/5.0 (Linux; Android 14; Pixel) Chrome/120 Mobile Safari/537', 'Chrome', 'Android', 'mobile', false],
    ['Mozilla/5.0 (compatible; Googlebot/2.1)', 'Other', 'Other', 'desktop', true],
    ['', 'Other', 'Other', 'desktop', true],
  ])('%s', (ua, browser, os, device, bot) => {
    expect(parseAgent(ua)).toEqual({ browser, os, device, bot });
  });
});
