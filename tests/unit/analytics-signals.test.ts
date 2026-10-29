import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import worker from '../../worker/src/index';
import { TOKEN, UA, get, post } from './helpers/requests';
import { migrationFiles, setup } from './helpers/worker-db';
import type { Summary } from '@/scripts/stats/types';

const id = (c: string) => c.repeat(32);
const [V1, V2, V3] = [id('1'), id('2'), id('3')];
const [PV1, PV2, PV3] = [id('a'), id('b'), id('c')];

const hit = (extra: Record<string, unknown> = {}) => ({
  type: 'hit',
  pv: PV1,
  visitor: V1,
  path: '/posts/x/',
  referrer: '',
  screen: '1920x1080',
  lang: 'en-US',
  tz: 'Asia/Tokyo',
  viewport: '1280x720',
  dpr: '2',
  touch: 0,
  nav: 'navigate',
  utm_source: 'chatgpt.com',
  utm_medium: 'referral',
  utm_campaign: '',
  automation: false,
  ...extra,
});

const leave = (extra: Record<string, unknown> = {}) => ({ type: 'leave', pv: PV1, visitor: V1, ms: 1000, ...extra });

describe('signals sent with a page view', () => {
  it('stores them', async () => {
    const { env, rows } = setup();
    await worker.fetch(post(hit()), env);
    expect(
      rows('SELECT viewport, dpr, touch, nav, utm_source, utm_medium, utm_campaign, automation, ua FROM visits'),
    ).toEqual([
      {
        viewport: '1280x720',
        dpr: '2',
        touch: 0,
        nav: 'navigate',
        utm_source: 'chatgpt.com',
        utm_medium: 'referral',
        utm_campaign: '',
        automation: 0,
        ua: UA,
      },
    ]);
  });

  it('drops anything a browser would not send', async () => {
    const { env, rows } = setup();
    await worker.fetch(
      post(
        hit({
          viewport: 'huge',
          dpr: '2x',
          nav: 'teleport',
          touch: 'many',
          utm_source: '<script>alert(1)</script>',
          utm_medium: 'a'.repeat(65),
          automation: 'yes',
        }),
      ),
      env,
    );
    expect(rows('SELECT viewport, dpr, touch, nav, utm_source, utm_medium, automation FROM visits')).toEqual([
      { viewport: '', dpr: '', touch: null, nav: '', utm_source: '', utm_medium: '', automation: null },
    ]);
  });

  it('keeps the browser identifier but at most 300 characters', async () => {
    const { env, rows } = setup();
    await worker.fetch(post(hit(), { ua: `Mozilla/5.0 ${'x'.repeat(400)}` }), env);
    const [{ ua }] = rows<{ ua: string }>('SELECT ua FROM visits');
    expect(ua).toHaveLength(300);
    expect(ua.startsWith('Mozilla/5.0 xxx')).toBe(true);
  });

  it('is unknown, not "no", when an older page does not send it', async () => {
    const { env, rows } = setup();
    await worker.fetch(post({ type: 'hit', pv: PV1, visitor: V1, path: '/' }), env);
    expect(rows('SELECT touch, automation, interacted, scroll_pct FROM visits')).toEqual([
      { touch: null, automation: null, interacted: null, scroll_pct: null },
    ]);
  });
});

describe('signals reported when the visitor leaves', () => {
  it('stores interaction and scroll depth', async () => {
    const { env, rows } = setup();
    await worker.fetch(post(hit()), env);
    await worker.fetch(post(leave({ scroll: 80, interacted: true })), env);
    expect(rows('SELECT scroll_pct, interacted FROM visits')).toEqual([{ scroll_pct: 80, interacted: 1 }]);
  });

  it('only lets them grow when reported again', async () => {
    const { env, rows } = setup();
    await worker.fetch(post(hit()), env);
    await worker.fetch(post(leave({ scroll: 80, interacted: true })), env);
    await worker.fetch(post(leave({ scroll: 40, interacted: false })), env);
    expect(rows('SELECT scroll_pct, interacted FROM visits')).toEqual([{ scroll_pct: 80, interacted: 1 }]);
  });

  it('caps the depth at 100', async () => {
    const { env, rows } = setup();
    await worker.fetch(post(hit()), env);
    await worker.fetch(post(leave({ scroll: 500 })), env);
    expect(rows('SELECT scroll_pct FROM visits')).toEqual([{ scroll_pct: 100 }]);
  });

  it('leaves them unknown for a report that carries only the time', async () => {
    const { env, rows } = setup();
    await worker.fetch(post(hit()), env);
    await worker.fetch(post(leave({ ms: 7000 })), env);
    expect(rows('SELECT duration_ms, scroll_pct, interacted FROM visits')).toEqual([
      { duration_ms: 7000, scroll_pct: null, interacted: null },
    ]);
  });
});

describe('summary of the signals', () => {
  async function filled() {
    const world = setup({ STATS_TOKEN: TOKEN });
    const { env } = world;
    const cf = { country: 'JP', city: 'Tokyo', asOrganization: 'KDDI', asn: 2516 };

    await worker.fetch(post(hit(), { cf }), env);
    await worker.fetch(post(leave({ scroll: 100, interacted: true })), env);

    await worker.fetch(
      post(
        hit({
          pv: PV2,
          visitor: V2,
          lang: 'zh-CN',
          screen: '390x844',
          viewport: '390x700',
          touch: 5,
          nav: 'spa',
          utm_source: '',
          utm_medium: '',
          automation: true,
        }),
        { cf: { ...cf, asOrganization: 'NTT' } },
      ),
      env,
    );
    await worker.fetch(post(leave({ pv: PV2, visitor: V2, scroll: 10, interacted: false })), env);

    await worker.fetch(post({ type: 'hit', pv: PV3, visitor: V3, path: '/', lang: 'en-US' }, { cf }), env);
    const summary = async () => (await (await worker.fetch(get('/api/summary?days=30&bots=1'), env)).json()) as Summary;
    return { ...world, summary };
  }

  it('counts only the visits that were measured', async () => {
    const { summary } = await filled();
    expect((await summary()).behavior).toEqual({
      interaction: { measured: 2, yes: 1 },
      automation: { measured: 2, yes: 1 },
      touch: { measured: 2, yes: 1 },
      scroll: { measured: 2, average: 55 },
    });
  });

  it('hides a visit that reports automation unless bots are asked for', async () => {
    const { env } = await filled();
    const { visits } = (await (await worker.fetch(get('/api/visits?days=30&limit=10'), env)).json()) as {
      visits: { visitor_id: string }[];
    };
    expect(visits.map((v) => v.visitor_id)).not.toContain(V2);
  });

  it('puts scroll depth into quarters', async () => {
    const { summary } = await filled();
    expect(await summary().then((s) => s.scrollBuckets)).toEqual(
      expect.arrayContaining([
        { bucket: 0, views: 1 },
        { bucket: 4, views: 1 },
      ]),
    );
  });

  it('ranks networks, languages, screens, time zones and how visitors arrived', async () => {
    const { summary } = await filled();
    const s = await summary();
    expect(s.networks.map((n: { name: string }) => n.name).sort()).toEqual(['KDDI', 'NTT']);
    expect(s.languages).toEqual([
      { name: 'en-US', views: 2, visitors: 2 },
      { name: 'zh-CN', views: 1, visitors: 1 },
    ]);
    expect(s.screens.map((n: { name: string }) => n.name).sort()).toEqual(['1920x1080', '390x844']);
    // The older page sent no time zone, so it is not counted here.
    expect(s.timezones).toEqual([{ name: 'Asia/Tokyo', views: 2, visitors: 2 }]);
    expect(s.navTypes.map((n: { name: string }) => n.name).sort()).toEqual(['navigate', 'spa']);
  });

  it('groups window widths into steps', async () => {
    const { summary } = await filled();
    expect(await summary().then((s) => s.viewportWidths)).toEqual(
      expect.arrayContaining([
        { bucket: 0, views: 1 },
        { bucket: 4, views: 1 },
      ]),
    );
  });

  it('lists where visitors were sent from by campaign tags', async () => {
    const { summary } = await filled();
    const { utm } = await summary();
    expect(utm.sources).toEqual([{ name: 'chatgpt.com', views: 1, visitors: 1 }]);
    expect(utm.mediums).toEqual([{ name: 'referral', views: 1, visitors: 1 }]);
    expect(utm.campaigns).toEqual([]);
  });

  it('returns every field of a visit, with unknown kept as null', async () => {
    const { env } = await filled();
    const { visits } = (await (await worker.fetch(get('/api/visits?days=30&limit=10&bots=1'), env)).json()) as {
      visits: Record<string, unknown>[];
    };
    const byVisitor = (v: string) => visits.find((row) => row.visitor_id === v)!;
    expect(byVisitor(V1)).toMatchObject({
      viewport: '1280x720',
      dpr: '2',
      touch: 0,
      nav: 'navigate',
      utm_source: 'chatgpt.com',
      automation: false,
      interacted: true,
      scroll_pct: 100,
      asn: 2516,
      ua: UA,
    });
    expect(byVisitor(V2)).toMatchObject({ automation: true, interacted: false, scroll_pct: 10 });
    expect(byVisitor(V3)).toMatchObject({ automation: null, interacted: null, scroll_pct: null, touch: null });
  });
});

describe('a database that already has visits from before the signals existed', () => {
  it('still reads them after the new migration', async () => {
    const files = migrationFiles();
    const { env, sqlite } = setup({ STATS_TOKEN: TOKEN }, files.slice(0, 1));
    sqlite.exec(`
      INSERT INTO visitors (id, first_seen, last_seen, visits) VALUES ('${V1}', ${Date.now()}, ${Date.now()}, 1);
      INSERT INTO visits (pv, visitor_id, ts, path, referrer, country, region, city, asn, as_org, tz, browser, os, device, screen, lang, is_bot, ip_hash, duration_ms)
      VALUES ('${PV1}', '${V1}', ${Date.now()}, '/old/', '', 'JP', '', 'Tokyo', 0, 'ISP', 'Asia/Tokyo', 'Chrome', 'Windows', 'desktop', '1920x1080', 'ja', 0, 'h', 4000);
    `);
    for (const file of files.slice(1))
      sqlite.exec(readFileSync(new URL(`../../worker/migrations/${file}`, import.meta.url), 'utf8'));

    const summary = (await (await worker.fetch(get('/api/summary?days=30&bots=1'), env)).json()) as {
      totals: { views: number };
      behavior: { interaction: { measured: number } };
    };
    expect(summary.totals.views).toBe(1);
    expect(summary.behavior.interaction.measured).toBe(0);

    const { visits } = (await (await worker.fetch(get('/api/visits?days=30'), env)).json()) as {
      visits: Record<string, unknown>[];
    };
    expect(visits[0]).toMatchObject({
      path: '/old/',
      viewport: '',
      automation: null,
      interacted: null,
      scroll_pct: null,
    });
  });
});
