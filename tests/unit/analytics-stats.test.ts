import { beforeEach, describe, expect, it } from 'vitest';
import worker from '../../worker/src/index';
import { TOKEN, get } from './helpers/requests';
import { ORIGIN, setup } from './helpers/worker-db';
import type { Summary, VisitList } from '@/scripts/stats/types';

const DAY = 24 * 60 * 60 * 1000;
const id = (c: string) => c.repeat(32);
const [A, B, C, D] = [id('a'), id('b'), id('c'), id('d')];

interface SeedVisit {
  visitor: string;
  daysAgo: number;
  path?: string;
  referrer?: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  device?: string;
  bot?: boolean;
  duration?: number | null;
}

function seeded() {
  const world = setup({ STATS_TOKEN: TOKEN });
  const now = Date.now();
  let n = 0;
  const visit = (v: SeedVisit) => {
    const ts = now - v.daysAgo * DAY;
    world.sqlite
      .prepare(
        `INSERT INTO visits (pv, visitor_id, ts, path, referrer, country, region, city, asn, as_org, tz, browser, os, device, screen, lang, is_bot, ip_hash, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, '', ?, 0, 'ISP', 'Asia/Tokyo', ?, ?, ?, '1x1', 'ja', ?, 'h', ?)`,
      )
      .run(
        (++n).toString(16).padStart(32, '0'),
        v.visitor,
        ts,
        v.path ?? '/',
        v.referrer ?? '',
        v.country ?? 'JP',
        v.city ?? 'Tokyo',
        v.browser ?? 'Chrome',
        v.os ?? 'Windows',
        v.device ?? 'desktop',
        v.bot ? 1 : 0,
        v.duration === undefined ? null : v.duration,
      );
    return ts;
  };
  const visitor = (idValue: string, daysAgo: number) =>
    world.sqlite
      .prepare('INSERT INTO visitors (id, first_seen, last_seen, visits) VALUES (?, ?, ?, 1)')
      .run(idValue, now - daysAgo * DAY, now - daysAgo * DAY);

  visitor(A, 100);
  visitor(B, 2);
  visitor(C, 1);
  visitor(D, 60);

  visit({ visitor: A, daysAgo: 100, path: '/old/' });
  const aFirst = visit({ visitor: A, daysAgo: 3, referrer: 'https://www.google.com/search', duration: 4000 });
  const aSecond = visit({ visitor: A, daysAgo: 1, path: '/posts/x/', referrer: '/', duration: 6000 });
  const bOnly = visit({
    visitor: B,
    daysAgo: 2,
    path: '/posts/x/',
    country: 'US',
    city: 'New York',
    browser: 'Safari',
    os: 'iOS',
    device: 'mobile',
  });
  visit({ visitor: C, daysAgo: 1, bot: true });
  visit({ visitor: D, daysAgo: 60, path: '/old/' });

  return { ...world, aFirst, aSecond, bOnly };
}

const jst = (ts: number) => new Date(ts + 9 * 60 * 60 * 1000);

describe('stats API access', () => {
  it('does not exist without a configured token', async () => {
    const { env } = setup();
    expect((await worker.fetch(get('/api/summary'), env)).status).toBe(404);
  });

  it.each([
    ['no token', null],
    ['a wrong token', 'nope'],
  ])('rejects %s', async (_name, token) => {
    const { env } = seeded();
    expect((await worker.fetch(get('/api/summary', { token }), env)).status).toBe(401);
  });

  it('rejects other origins even with the right token', async () => {
    const { env } = seeded();
    expect((await worker.fetch(get('/api/summary', { origin: 'https://evil.test' }), env)).status).toBe(403);
  });

  it('lets the browser send the token across origins', async () => {
    const { env } = seeded();
    const res = await worker.fetch(
      new Request('https://worker.test/api/summary', { method: 'OPTIONS', headers: { origin: ORIGIN } }),
      env,
    );
    expect(res.headers.get('access-control-allow-headers')).toContain('authorization');
    expect(res.headers.get('access-control-allow-methods')).toContain('GET');
  });

  it('answers with the CORS header and without caching', async () => {
    const { env } = seeded();
    const res = await worker.fetch(get('/api/summary'), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('returns 404 for an unknown path', async () => {
    const { env } = seeded();
    expect((await worker.fetch(get('/api/nothing'), env)).status).toBe(404);
  });
});

describe('summary', () => {
  let world: ReturnType<typeof seeded>;
  beforeEach(() => {
    world = seeded();
  });
  const summary = async (query = '') =>
    (await worker.fetch(get(`/api/summary${query}`), world.env)).json() as Promise<Summary>;

  it('counts the last 30 days without bots by default', async () => {
    const { totals } = await summary();
    expect(totals).toEqual({ views: 3, visitors: 2, newVisitors: 1, returningVisitors: 1, avgDurationMs: 5000 });
  });

  it('includes bots on request', async () => {
    expect((await summary('?bots=1')).totals.views).toBe(4);
  });

  it('widens and narrows the range', async () => {
    expect((await summary('?days=90')).totals.views).toBe(4);
    expect((await summary('?days=0')).totals.views).toBe(5);
    expect((await summary('?days=2')).totals.views).toBe(1);
  });

  it('falls back to 30 days for nonsense', async () => {
    expect((await summary('?days=abc')).days).toBe(30);
  });

  it('groups views by day in Tokyo time', async () => {
    const { daily } = await summary();
    const day = (ts: number) => jst(ts).toISOString().slice(0, 10);
    expect(daily.map((d: { day: string }) => d.day)).toEqual([day(world.aFirst), day(world.bOnly), day(world.aSecond)]);
    expect(daily.reduce((sum: number, d: { views: number }) => sum + d.views, 0)).toBe(3);
  });

  it('places each view in its Tokyo weekday and hour', async () => {
    const { heatmap } = await summary();
    const at = jst(world.aFirst);
    expect(heatmap).toContainEqual({ dow: at.getUTCDay(), hour: at.getUTCHours(), views: expect.any(Number) });
    expect(heatmap.reduce((sum: number, h: { views: number }) => sum + h.views, 0)).toBe(3);
  });

  it('ranks pages and averages only measured time on page', async () => {
    const { pages } = await summary();
    expect(pages[0]).toEqual({ path: '/posts/x/', views: 2, visitors: 2, avg_ms: 6000 });
    expect(pages[1]).toMatchObject({ path: '/', views: 1, avg_ms: 4000 });
  });

  it('tells outside sources from direct and in-site visits', async () => {
    const { referrers } = await summary();
    expect(referrers).toEqual({ direct: 1, internal: 1, external: [{ host: 'google.com', views: 1 }] });
  });

  it('breaks down places and devices', async () => {
    const result = await summary();
    expect(result.countries).toEqual([
      { name: 'JP', views: 2, visitors: 1 },
      { name: 'US', views: 1, visitors: 1 },
    ]);
    expect(result.cities.map((c: { city: string }) => c.city)).toEqual(['Tokyo', 'New York']);
    expect(result.devices.map((d: { name: string }) => d.name)).toEqual(['desktop', 'mobile']);
    expect(result.systems.map((d: { name: string }) => d.name).sort()).toEqual(['Windows', 'iOS']);
    expect(result.browsers.map((d: { name: string }) => d.name).sort()).toEqual(['Chrome', 'Safari']);
  });

  it('works on an empty database', async () => {
    const empty = setup({ STATS_TOKEN: TOKEN });
    const res = await worker.fetch(get('/api/summary'), empty.env);
    const body = (await res.json()) as Summary;
    expect(body.totals).toEqual({ views: 0, visitors: 0, newVisitors: 0, returningVisitors: 0, avgDurationMs: null });
    expect(body.pages).toEqual([]);
  });
});

describe('visits', () => {
  let world: ReturnType<typeof seeded>;
  beforeEach(() => {
    world = seeded();
  });
  const list = async (query = '') =>
    (await worker.fetch(get(`/api/visits${query}`), world.env)).json() as Promise<VisitList>;

  it('lists the newest first and hides bots', async () => {
    const { visits, next } = await list();
    expect(visits.map((v: { ts: number }) => v.ts)).toEqual([world.aSecond, world.bOnly, world.aFirst]);
    expect(next).toBeNull();
  });

  it('marks the first visit of each visitor', async () => {
    const { visits } = await list();
    expect(visits.map((v: { is_first: boolean }) => v.is_first)).toEqual([false, true, false]);
    expect((await list('?first=1')).visits.map((v: { ts: number }) => v.ts)).toEqual([world.bOnly]);
  });

  it('never exposes the IP hash or page view id', async () => {
    const text = JSON.stringify(await list());
    expect(text).not.toContain('ip_hash');
    expect(text).not.toContain('"pv"');
  });

  it('pages through the list with a cursor', async () => {
    const first = await list('?limit=2');
    expect(first.visits).toHaveLength(2);
    expect(first.next).toBe(world.bOnly);
    const second = await list(`?limit=2&before=${first.next}`);
    expect(second.visits.map((v: { ts: number }) => v.ts)).toEqual([world.aFirst]);
    expect(second.next).toBeNull();
  });

  it('shows one visitor across all time', async () => {
    const { visits } = await list(`?visitor=${A}&days=0`);
    expect(visits).toHaveLength(3);
    expect(visits.every((v: { visitor_id: string }) => v.visitor_id === A)).toBe(true);
  });

  it('filters by page and country', async () => {
    expect((await list('?path=/posts/x/')).visits).toHaveLength(2);
    expect((await list('?country=US')).visits).toHaveLength(1);
  });

  it('includes bots on request', async () => {
    expect((await list('?bots=1')).visits).toHaveLength(4);
  });

  it('hides a suspect visit like a bot, in the list and in the totals', async () => {
    world.sqlite.prepare('UPDATE visits SET is_bot = 0, suspect = 1 WHERE visitor_id = ?').run(C);
    expect((await list()).visits).toHaveLength(3);
    expect((await list('?bots=1')).visits).toHaveLength(4);
    const views = async (query: string) =>
      ((await (await worker.fetch(get(`/api/summary?days=30${query}`), world.env)).json()) as Summary).totals.views;
    expect(await views('&bots=1')).toBe((await views('')) + 1);
  });

  it.each([['visitor=zzz'], ['country=jp'], ['path=x'], ['path=/a?b=1']])('rejects the filter %s', async (query) => {
    const res = await worker.fetch(get(`/api/visits?${query}`), world.env);
    expect(res.status).toBe(400);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });
});
