import { DAY, TOKYO, firstSeen, now, rows } from './data.mjs';

const TOP = 10;

const count = (list, key, extra = () => ({})) => {
  const groups = new Map();
  for (const row of list) {
    const k = typeof key === 'function' ? key(row) : row[key];
    if (k === '' || k === undefined || k === null) continue;
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
const buckets = (values, edges) => {
  const counts = new Map();
  for (const v of values) {
    const bucket = edges.findIndex((edge) => v < edge);
    const index = bucket === -1 ? edges.length : bucket;
    counts.set(index, (counts.get(index) ?? 0) + 1);
  }
  return [...counts].map(([bucket, views]) => ({ bucket, views })).sort((a, b) => a.bucket - b.bucket);
};
const measuredShare = (list, key, yes) => {
  const known = list.filter((r) => r[key] !== null);
  return { measured: known.length, yes: known.filter(yes).length };
};

function summary({ days, bots }) {
  const since = days ? now - days * DAY : 0;
  const list = rows.filter((r) => r.ts >= since && (bots || (!r.is_bot && !r.suspect)));
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

  const scrolls = list.filter((r) => r.scroll_pct !== null).map((r) => r.scroll_pct);
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
    networks: named(list, 'as_org'),
    languages: named(list, 'lang'),
    screens: named(list, 'screen'),
    timezones: named(list, 'tz'),
    navTypes: named(list, 'nav'),
    utm: {
      sources: named(list, 'utm_source'),
      mediums: named(list, 'utm_medium'),
      campaigns: named(list, 'utm_campaign'),
    },
    viewportWidths: buckets(
      list.filter((r) => r.viewport).map((r) => Number(r.viewport.split('x')[0])),
      [576, 768, 992, 1200, 1600],
    ),
    scrollBuckets: buckets(scrolls, [25, 50, 75, 100]),
    behavior: {
      interaction: measuredShare(list, 'interacted', (r) => r.interacted),
      automation: measuredShare(list, 'automation', (r) => r.automation),
      touch: measuredShare(list, 'touch', (r) => r.touch > 0),
      scroll: {
        measured: scrolls.length,
        average: scrolls.length ? Math.round(scrolls.reduce((a, b) => a + b, 0) / scrolls.length) : null,
      },
    },
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
      (params.get('bots') === '1' || (!r.is_bot && !r.suspect)) &&
      (!params.get('path') || r.path === params.get('path')) &&
      (!params.get('country') || r.country === params.get('country')) &&
      (!visitor || r.visitor_id === visitor) &&
      (params.get('first') !== '1' || r.is_first),
  );
  const page = list.slice(0, limit);
  return { visits: page, next: list.length > limit ? page[page.length - 1].ts : null };
}

export { summary, visits };
