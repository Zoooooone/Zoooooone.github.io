import type { Database } from '../types';
import { all, type Filters } from './shared';

// Charts are shown in Tokyo time. The offset is a literal in the SQL, never user input.
const TZ_OFFSET_S = 9 * 3600;
const TOP = 10;

type Grouped =
  | 'country'
  | 'browser'
  | 'os'
  | 'device'
  | 'as_org'
  | 'lang'
  | 'screen'
  | 'tz'
  | 'nav'
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign';

const hostOf = (referrer: string): string => {
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const roundOrNull = (value: number | null) => (value === null ? null : Math.round(value));

function sourcesOf(referrers: { referrer: string; views: number }[]) {
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
  return {
    direct: sources.direct,
    internal: sources.internal,
    external: [...sources.external]
      .map(([host, count]) => ({ host, views: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, TOP),
  };
}

export async function summary(db: Database, { since, bots }: Filters) {
  const where = bots ? 'ts >= ?' : 'ts >= ? AND is_bot = 0 AND suspect = 0';
  const local = `(ts / 1000 + ${TZ_OFFSET_S})`;
  const rows = async <T>(sql: string, binds: unknown[] = [since]) =>
    (
      await db
        .prepare(sql)
        .bind(...binds)
        .all<T>()
    ).results;

  const breakdown = (column: Grouped) =>
    rows<{ name: string; views: number; visitors: number }>(
      `SELECT ${column} AS name, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
       FROM visits WHERE ${where} AND ${column} != '' GROUP BY ${column} ORDER BY views DESC LIMIT ${TOP}`,
    );

  const data = await all({
    totals: rows<{ views: number; visitors: number; avg_ms: number | null }>(
      `SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors, AVG(duration_ms) AS avg_ms
       FROM visits WHERE ${where}`,
    ),
    people: rows<{ new_visitors: number }>(
      `SELECT COALESCE(SUM(first_seen >= ?), 0) AS new_visitors FROM visitors
       WHERE id IN (SELECT visitor_id FROM visits WHERE ${where})`,
      [since, since],
    ),
    daily: rows<{ day: string; views: number; visitors: number }>(
      `SELECT strftime('%Y-%m-%d', ${local}, 'unixepoch') AS day, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
       FROM visits WHERE ${where} GROUP BY day ORDER BY day`,
    ),
    heatmap: rows<{ dow: number; hour: number; views: number }>(
      `SELECT CAST(strftime('%w', ${local}, 'unixepoch') AS INTEGER) AS dow,
              CAST(strftime('%H', ${local}, 'unixepoch') AS INTEGER) AS hour, COUNT(*) AS views
       FROM visits WHERE ${where} GROUP BY dow, hour`,
    ),
    pages: rows<{ path: string; views: number; visitors: number; avg_ms: number | null }>(
      `SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors, AVG(duration_ms) AS avg_ms
       FROM visits WHERE ${where} GROUP BY path ORDER BY views DESC LIMIT 15`,
    ),
    referrers: rows<{ referrer: string; views: number }>(
      `SELECT referrer, COUNT(*) AS views FROM visits WHERE ${where} GROUP BY referrer ORDER BY views DESC LIMIT 300`,
    ),
    countries: breakdown('country'),
    cities: rows<{ country: string; city: string; views: number; visitors: number }>(
      `SELECT country, city, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
       FROM visits WHERE ${where} AND city != '' GROUP BY country, city ORDER BY views DESC LIMIT ${TOP}`,
    ),
    browsers: breakdown('browser'),
    systems: breakdown('os'),
    devices: breakdown('device'),
    networks: breakdown('as_org'),
    languages: breakdown('lang'),
    screens: breakdown('screen'),
    timezones: breakdown('tz'),
    navTypes: breakdown('nav'),
    utmSources: breakdown('utm_source'),
    utmMediums: breakdown('utm_medium'),
    utmCampaigns: breakdown('utm_campaign'),
    viewportWidths: rows<{ bucket: number; views: number }>(
      `SELECT CASE WHEN w < 576 THEN 0 WHEN w < 768 THEN 1 WHEN w < 992 THEN 2 WHEN w < 1200 THEN 3 WHEN w < 1600 THEN 4 ELSE 5 END AS bucket,
              COUNT(*) AS views
       FROM (SELECT CAST(substr(viewport, 1, instr(viewport, 'x') - 1) AS INTEGER) AS w
             FROM visits WHERE ${where} AND viewport != '')
       GROUP BY bucket`,
    ),
    scrollBuckets: rows<{ bucket: number; views: number }>(
      `SELECT CASE WHEN scroll_pct < 25 THEN 0 WHEN scroll_pct < 50 THEN 1 WHEN scroll_pct < 75 THEN 2 WHEN scroll_pct < 100 THEN 3 ELSE 4 END AS bucket,
              COUNT(*) AS views
       FROM visits WHERE ${where} AND scroll_pct IS NOT NULL GROUP BY bucket`,
    ),
    signals: rows<{
      interaction_measured: number;
      interacted: number;
      automation_measured: number;
      automated: number;
      touch_measured: number;
      touch: number;
      scroll_measured: number;
      scroll_avg: number | null;
    }>(
      `SELECT COUNT(interacted) AS interaction_measured, COALESCE(SUM(interacted = 1), 0) AS interacted,
              COUNT(automation) AS automation_measured, COALESCE(SUM(automation = 1), 0) AS automated,
              COUNT(touch) AS touch_measured, COALESCE(SUM(touch > 0), 0) AS touch,
              COUNT(scroll_pct) AS scroll_measured, AVG(scroll_pct) AS scroll_avg
       FROM visits WHERE ${where}`,
    ),
  });

  const { views, visitors, avg_ms } = data.totals[0];
  const newVisitors = data.people[0].new_visitors;
  const signals = data.signals[0];
  return {
    totals: {
      views,
      visitors,
      newVisitors,
      returningVisitors: visitors - newVisitors,
      avgDurationMs: roundOrNull(avg_ms),
    },
    daily: data.daily,
    heatmap: data.heatmap,
    pages: data.pages.map((p) => ({ ...p, avg_ms: roundOrNull(p.avg_ms) })),
    referrers: sourcesOf(data.referrers),
    countries: data.countries,
    cities: data.cities,
    browsers: data.browsers,
    systems: data.systems,
    devices: data.devices,
    networks: data.networks,
    languages: data.languages,
    screens: data.screens,
    timezones: data.timezones,
    navTypes: data.navTypes,
    utm: { sources: data.utmSources, mediums: data.utmMediums, campaigns: data.utmCampaigns },
    viewportWidths: data.viewportWidths,
    scrollBuckets: data.scrollBuckets,
    behavior: {
      interaction: { measured: signals.interaction_measured, yes: signals.interacted },
      automation: { measured: signals.automation_measured, yes: signals.automated },
      touch: { measured: signals.touch_measured, yes: signals.touch },
      scroll: { measured: signals.scroll_measured, average: roundOrNull(signals.scroll_avg) },
    },
  };
}
