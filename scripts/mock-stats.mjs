// Runs a fake stats Worker with made-up visits and starts the dev server pointed at it,
// so the stats page can be tried without touching the real database.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const PORT = 8788;
const DAY = 24 * 60 * 60 * 1000;
const TOKYO = 9 * 60 * 60 * 1000;
const TOP = 10;

// Seeded random numbers, so the page looks the same on every run.
let seed = 20261021;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (items) => {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [value, weight] of items) if ((roll -= weight) <= 0) return value;
  return items[0][0];
};

const PLACES = [
  [{ country: 'JP', city: 'Tokyo', org: 'KDDI' }, 38],
  [{ country: 'JP', city: 'Osaka', org: 'NTT' }, 10],
  [{ country: 'CN', city: 'Shanghai', org: 'China Telecom' }, 16],
  [{ country: 'CN', city: 'Beijing', org: 'China Unicom' }, 8],
  [{ country: 'US', city: 'Los Angeles', org: 'Comcast' }, 9],
  [{ country: 'DE', city: 'Frankfurt', org: 'Hetzner' }, 5],
  [{ country: 'SG', city: 'Singapore', org: 'AWS' }, 4],
  [{ country: 'AU', city: 'Sydney', org: 'Telstra' }, 3],
];
const DEVICES = [
  [{ browser: 'Chrome', os: 'Windows', device: 'desktop' }, 40],
  [{ browser: 'Safari', os: 'iOS', device: 'mobile' }, 20],
  [{ browser: 'Chrome', os: 'Android', device: 'mobile' }, 12],
  [{ browser: 'Safari', os: 'macOS', device: 'desktop' }, 10],
  [{ browser: 'Edge', os: 'Windows', device: 'desktop' }, 10],
  [{ browser: 'Firefox', os: 'Linux', device: 'desktop' }, 5],
  [{ browser: 'Safari', os: 'iOS', device: 'tablet' }, 3],
];
const PATHS = [
  ['/', 30],
  ['/posts/docker/', 14],
  ['/posts/pgvector/', 10],
  ['/posts/clean-docker-disk/', 6],
  ['/posts/waline/', 6],
  ['/posts/first-pc-build/', 5],
  ['/posts/year-end-summary/', 4],
  ['/about/', 5],
  ['/archives/', 4],
  ['/tags/', 3],
  ['/changelog/', 3],
  ['/posts/Odawara/', 3],
  ['/posts/Leetcode_343/', 2],
];
const REFERRERS = [
  ['', 30],
  ['https://www.google.com/search', 22],
  ['https://github.com/Zoooooone', 6],
  ['https://www.zhihu.com/question/1', 3],
  ['https://t.co/', 2],
  ['https://www.bing.com/', 2],
];

const now = Date.now();
const randomId = () => Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16)).join('');

// About 3 months of visits that grow towards today, busiest in the evening, Tokyo time.
const visitors = Array.from({ length: 260 }, () => ({ id: randomId(), ...pick(PLACES), ...pick(DEVICES) }));
const rows = [];
for (let n = 0; n < 1800; n++) {
  const daysAgo = Math.floor(Math.pow(random(), 1.6) * 90);
  const hour = pick(
    [...Array(24).keys()].map((h) => [h, 1 + 9 * Math.exp(-((h - 21) ** 2) / 14) + 4 * Math.exp(-((h - 12) ** 2) / 8)]),
  );
  const day = new Date(now - daysAgo * DAY + TOKYO);
  day.setUTCHours(hour, Math.floor(random() * 60), Math.floor(random() * 60));
  const ts = day.getTime() - TOKYO;
  if (ts > now) continue;

  const visitor = visitors[Math.floor(Math.pow(random(), 1.3) * visitors.length)];
  const bot = random() < 0.07;
  rows.push({
    visitor_id: visitor.id,
    ts,
    path: pick(PATHS),
    referrer: random() < 0.25 ? '/' : pick(REFERRERS),
    country: visitor.country,
    region: '',
    city: visitor.city,
    as_org: visitor.org,
    browser: bot ? 'Other' : visitor.browser,
    os: bot ? 'Linux' : visitor.os,
    device: visitor.device,
    screen: '1920x1080',
    lang: 'ja',
    is_bot: bot,
    duration_ms: random() < 0.15 ? null : Math.round(2000 + random() ** 2 * 280000),
  });
}
rows.sort((a, b) => b.ts - a.ts);

const firstSeen = new Map();
for (const row of rows) firstSeen.set(row.visitor_id, Math.min(firstSeen.get(row.visitor_id) ?? Infinity, row.ts));
for (const row of rows) row.is_first = row.ts === firstSeen.get(row.visitor_id);

const count = (list, key, extra = () => ({})) => {
  const groups = new Map();
  for (const row of list) {
    const k = typeof key === 'function' ? key(row) : row[key];
    if (k === '' || k === undefined) continue;
    const g = groups.get(k) ?? { views: 0, people: new Set(), ...extra(row) };
    g.views++;
    g.people.add(row.visitor_id);
    groups.set(k, g);
  }
  return [...groups].map(([k, g]) => ({ key: k, ...g, visitors: g.people.size }));
};
const top = (list, limit = TOP) => list.sort((a, b) => b.views - a.views).slice(0, limit);
const named = (list, key) => top(count(list, key)).map((g) => ({ name: g.key, views: g.views, visitors: g.visitors }));
const average = (list) => {
  const measured = list.filter((r) => r.duration_ms !== null);
  return measured.length ? measured.reduce((sum, r) => sum + r.duration_ms, 0) / measured.length : null;
};

function summary({ days, bots }) {
  const since = days ? now - days * DAY : 0;
  const list = rows.filter((r) => r.ts >= since && (bots || !r.is_bot));
  const people = new Set(list.map((r) => r.visitor_id));
  const newVisitors = [...people].filter((v) => firstSeen.get(v) >= since).length;

  const daily = count(list, (r) => new Date(r.ts + TOKYO).toISOString().slice(0, 10))
    .map((g) => ({ day: g.key, views: g.views, visitors: g.visitors }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const heat = new Map();
  for (const r of list) {
    const d = new Date(r.ts + TOKYO);
    const key = `${d.getUTCDay()}-${d.getUTCHours()}`;
    heat.set(key, (heat.get(key) ?? 0) + 1);
  }
  const external = new Map();
  let direct = 0;
  let internal = 0;
  for (const r of list) {
    if (!r.referrer) direct++;
    else if (r.referrer.startsWith('/')) internal++;
    else {
      const host = new URL(r.referrer).hostname.replace(/^www\./, '');
      external.set(host, (external.get(host) ?? 0) + 1);
    }
  }

  const averageMs = average(list);
  return {
    days,
    totals: {
      views: list.length,
      visitors: people.size,
      newVisitors,
      returningVisitors: people.size - newVisitors,
      avgDurationMs: averageMs === null ? null : Math.round(averageMs),
    },
    daily,
    heatmap: [...heat].map(([key, views]) => {
      const [dow, hour] = key.split('-').map(Number);
      return { dow, hour, views };
    }),
    pages: top(count(list, 'path'), 15).map((g) => ({
      path: g.key,
      views: g.views,
      visitors: g.visitors,
      avg_ms: (() => {
        const ms = average(list.filter((r) => r.path === g.key));
        return ms === null ? null : Math.round(ms);
      })(),
    })),
    referrers: {
      direct,
      internal,
      external: [...external]
        .map(([host, views]) => ({ host, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, TOP),
    },
    countries: named(list, 'country'),
    cities: top(count(list, 'city', (r) => ({ country: r.country }))).map((g) => ({
      country: g.country,
      city: g.key,
      views: g.views,
      visitors: g.visitors,
    })),
    browsers: named(list, 'browser'),
    systems: named(list, 'os'),
    devices: named(list, 'device'),
  };
}

function visits(params) {
  const days = Number(params.get('days') ?? 30);
  const visitor = params.get('visitor');
  const since = days && !visitor ? now - days * DAY : 0;
  const before = params.get('before') === null ? Infinity : Number(params.get('before'));
  const limit = Math.min(Math.max(Number(params.get('limit')) || 50, 1), 100);
  const list = rows.filter(
    (r) =>
      r.ts >= since &&
      r.ts < before &&
      (params.get('bots') === '1' || !r.is_bot) &&
      (!params.get('path') || r.path === params.get('path')) &&
      (!params.get('country') || r.country === params.get('country')) &&
      (!visitor || r.visitor_id === visitor) &&
      (params.get('first') !== '1' || r.is_first),
  );
  const page = list.slice(0, limit);
  return { visits: page, next: list.length > limit ? page[page.length - 1].ts : null };
}

createServer((request, response) => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization',
    'access-control-allow-methods': 'GET, POST',
  };
  if (request.method === 'OPTIONS') return response.writeHead(204, cors).end();

  const url = new URL(request.url, `http://localhost:${PORT}`);
  // Any token works, an empty one does not, so the sign-in screen can be tried as well.
  if (!/^Bearer .+/.test(request.headers.authorization ?? '')) return response.writeHead(401, cors).end();

  const days = Number(url.searchParams.get('days') ?? 30);
  const bots = url.searchParams.get('bots') === '1';
  const body =
    url.pathname === '/api/summary'
      ? summary({ days, bots })
      : url.pathname === '/api/visits'
        ? visits(url.searchParams)
        : null;
  if (!body) return response.writeHead(404, cors).end();
  response.writeHead(200, { ...cors, 'content-type': 'application/json' }).end(JSON.stringify(body));
}).listen(PORT, () => {
  console.log(`Fake stats Worker on http://localhost:${PORT} (any token works)`);
  const dev = spawn('pnpm exec astro dev', {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PUBLIC_STATS_ENDPOINT: `http://localhost:${PORT}` },
  });
  dev.on('exit', (code) => process.exit(code ?? 0));
});
