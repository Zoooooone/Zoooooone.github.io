import { describe, expect, it } from 'vitest';
import worker, { hashIp } from '../../worker/src/index';
import { judge } from '../../worker/src/suspect';
import { parseAgent } from '../../worker/src/ua';
import { IP, post } from './helpers/requests';
import { ORIGIN, setup } from './helpers/worker-db';

const ID = 'a'.repeat(32);
const pvOf = (n: number) => n.toString(16).padStart(32, '0');
const visitorOf = (n: number) => `f${n.toString(16).padStart(31, '0')}`;

const hit = (extra: Record<string, unknown> = {}) => ({
  type: 'hit',
  pv: pvOf(1),
  visitor: ID,
  path: '/posts/x/',
  referrer: '',
  screen: '390x844',
  lang: 'ja-JP',
  tz: 'Asia/Tokyo',
  ...extra,
});

describe('worker', () => {
  it('rejects other origins', async () => {
    const { env, rows } = setup();
    const res = await worker.fetch(post(hit(), { origin: 'https://evil.test' }), env);
    expect(res.status).toBe(403);
    expect(rows('SELECT * FROM visits')).toHaveLength(0);
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

  it('stores a hit and the visitor, without the raw IP', async () => {
    const { env, rows } = setup();
    const res = await worker.fetch(post(hit({ referrer: 'https://www.google.com/search' })), env);
    expect(res.status).toBe(204);

    const [visit] = rows<Record<string, unknown>>('SELECT * FROM visits');
    expect(visit).toMatchObject({
      path: '/posts/x/',
      referrer: 'https://www.google.com/search',
      browser: 'Chrome',
      os: 'Windows',
      device: 'desktop',
      screen: '390x844',
      lang: 'ja-JP',
      tz: 'Asia/Tokyo',
      is_bot: 0,
      duration_ms: null,
    });
    expect(visit.ip_hash).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(rows('SELECT * FROM visits'))).not.toContain(IP);
    expect(rows('SELECT visits FROM visitors')).toEqual([{ visits: 1 }]);
  });

  it('counts a second page view of the same visitor once more', async () => {
    const { env, rows } = setup();
    await worker.fetch(post(hit()), env);
    await worker.fetch(post(hit({ pv: pvOf(2), path: '/about/' })), env);
    expect(rows('SELECT visits FROM visitors')).toEqual([{ visits: 2 }]);
    expect(rows('SELECT path FROM visits')).toHaveLength(2);
  });

  it('ignores a replayed page view instead of counting the visitor again', async () => {
    const { env, rows } = setup();
    await worker.fetch(post(hit()), env);
    await worker.fetch(post(hit()), env);
    expect(rows('SELECT * FROM visits')).toHaveLength(1);
    expect(rows('SELECT visits FROM visitors')).toEqual([{ visits: 1 }]);
  });

  describe('time on page', () => {
    it('is stored by the leave report', async () => {
      const { env, rows } = setup();
      await worker.fetch(post(hit()), env);
      await worker.fetch(post({ type: 'leave', pv: pvOf(1), visitor: ID, ms: 5000 }), env);
      expect(rows('SELECT duration_ms FROM visits')).toEqual([{ duration_ms: 5000 }]);
    });

    it('keeps the largest value and never lowers it', async () => {
      const { env, rows } = setup();
      await worker.fetch(post(hit()), env);
      await worker.fetch(post({ type: 'leave', pv: pvOf(1), visitor: ID, ms: 9000 }), env);
      await worker.fetch(post({ type: 'leave', pv: pvOf(1), visitor: ID, ms: 2000 }), env);
      expect(rows('SELECT duration_ms FROM visits')).toEqual([{ duration_ms: 9000 }]);
    });

    it('is capped at one hour', async () => {
      const { env, rows } = setup();
      await worker.fetch(post(hit()), env);
      await worker.fetch(post({ type: 'leave', pv: pvOf(1), visitor: ID, ms: 99_999_999 }), env);
      expect(rows('SELECT duration_ms FROM visits')).toEqual([{ duration_ms: 3_600_000 }]);
    });

    it("cannot be set on another visitor's page view", async () => {
      const { env, rows } = setup();
      await worker.fetch(post(hit()), env);
      await worker.fetch(post({ type: 'leave', pv: pvOf(1), visitor: 'b'.repeat(32), ms: 5000 }), env);
      expect(rows('SELECT duration_ms FROM visits')).toEqual([{ duration_ms: null }]);
    });
  });

  describe('input checks', () => {
    it.each([
      ['malformed JSON', '{nope'],
      ['a bad visitor id', hit({ visitor: 'x' })],
      ['a bad page view id', hit({ pv: 'x' })],
      ['a path that is not absolute', hit({ path: 'https://x' })],
      ['a path with a query string', hit({ path: '/x/?token=1' })],
      ['a path with markup', hit({ path: '/<script>/' })],
      ['an unknown type', hit({ type: 'other' })],
    ])('rejects %s', async (_name, body) => {
      const { env, rows } = setup();
      const res = await worker.fetch(post(body), env);
      expect(res.status).toBe(400);
      expect(rows('SELECT * FROM visits')).toHaveLength(0);
    });

    it('rejects an oversized body', async () => {
      const { env } = setup();
      expect((await worker.fetch(post('x'.repeat(5000)), env)).status).toBe(413);
    });

    it('blanks optional fields that do not look like a browser sent them', async () => {
      const { env, rows } = setup();
      await worker.fetch(
        post(hit({ referrer: 'javascript:alert(1)', screen: 'huge', lang: '<b>hi</b>', tz: 'drop table;' })),
        env,
      );
      expect(rows('SELECT referrer, screen, lang, tz FROM visits')).toEqual([
        { referrer: '', screen: '', lang: '', tz: '' },
      ]);
    });

    it('keeps a same-site referrer path', async () => {
      const { env, rows } = setup();
      await worker.fetch(post(hit({ referrer: '/posts/other/' })), env);
      expect(rows('SELECT referrer FROM visits')).toEqual([{ referrer: '/posts/other/' }]);
    });
  });

  describe('rate limits', () => {
    it('stops one visitor from flooding after 20 page views a minute', async () => {
      const { env, rows } = setup();
      const statuses: number[] = [];
      for (let i = 1; i <= 22; i++) {
        statuses.push((await worker.fetch(post(hit({ pv: pvOf(i) })), env)).status);
      }
      expect(statuses.slice(0, 20).every((s) => s === 204)).toBe(true);
      expect(statuses.slice(20)).toEqual([429, 429]);
      expect(rows('SELECT * FROM visits')).toHaveLength(20);
    });

    it('stops one network from flooding with fresh visitor ids, but not other networks', async () => {
      const { env, rows } = setup();
      let rejected = 0;
      for (let i = 1; i <= 65; i++) {
        const res = await worker.fetch(post(hit({ pv: pvOf(i), visitor: visitorOf(i) })), env);
        if (res.status === 429) rejected++;
      }
      expect(rejected).toBe(5);
      expect(rows('SELECT * FROM visits')).toHaveLength(60);

      const other = await worker.fetch(
        post(hit({ pv: pvOf(999), visitor: visitorOf(999) }), { ip: '198.51.100.7' }),
        env,
      );
      expect(other.status).toBe(204);
    });
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

describe('judge', () => {
  const human = {
    automation: 0 as const,
    screen: '1710x1112',
    viewport: '1710x905',
    lang: 'zh-CN',
    referrer: '',
    tz: 'Asia/Tokyo',
    ipTz: 'Asia/Tokyo',
    asOrg: 'Japan Network Information Center',
  };
  const scraper = {
    ...human,
    screen: '1920x1080',
    viewport: '1804x762',
    lang: 'en-US',
    tz: 'Asia/Shanghai',
    ipTz: 'America/Bogota',
  };

  it('leaves an ordinary visitor alone', () => {
    expect(judge(human)).toEqual({ bot: false, suspect: false });
  });

  it.each([
    ['an automation flag', { automation: 1 as const }],
    ['the 800x600 default screen', { screen: '800x600' }],
    ['a Microsoft network', { asOrg: 'Microsoft Corporation' }],
    ['an OpenAI network', { asOrg: 'OpenAI' }],
    ['Google LLC', { asOrg: 'Google LLC' }],
  ])('counts %s as a bot', (_, change) => {
    expect(judge({ ...human, ...change }).bot).toBe(true);
  });

  it('does not mistake Google Fiber or Cloudflare WARP for a datacenter', () => {
    expect(judge({ ...human, asOrg: 'Google Fiber Inc.' }).bot).toBe(false);
    expect(judge({ ...human, asOrg: 'Cloudflare London, LLC' }).bot).toBe(false);
  });

  it('only records a scraper pattern without calling it a bot', () => {
    expect(judge(scraper)).toEqual({ bot: false, suspect: true });
  });

  it.each([
    ['a referrer', { referrer: '/posts/x/' }],
    ['a time zone in the same part of the world', { ipTz: 'Asia/Tokyo' }],
    ['no time zone from the network', { ipTz: '' }],
    ['a full-screen window', { viewport: '1920x1080' }],
    ['another screen', { screen: '1536x864' }],
    ['another language', { lang: 'ja' }],
  ])('stops suspecting a scraper pattern with %s', (_, change) => {
    expect(judge({ ...scraper, ...change }).suspect).toBe(false);
  });
});
