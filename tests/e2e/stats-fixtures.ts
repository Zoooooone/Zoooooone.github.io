import type { Page, Request } from '@playwright/test';
import { analytics } from '../../src/config/site';
import { ready } from './fixtures';

const HOST = new URL(analytics.endpoint).hostname;
const GOOD = 'good-token';
export const VISITOR = 'a'.repeat(32);
const NOW = Date.now();

export const summary = {
  days: 30,
  totals: { views: 1234, visitors: 321, newVisitors: 200, returningVisitors: 121, avgDurationMs: 192_000 },
  daily: [
    { day: '2026-10-19', views: 30, visitors: 12 },
    { day: '2026-10-21', views: 80, visitors: 40 },
  ],
  heatmap: [
    { dow: 1, hour: 21, views: 40 },
    { dow: 3, hour: 9, views: 10 },
  ],
  pages: [
    { path: '/posts/docker/', views: 90, visitors: 60, avg_ms: 120_000 },
    { path: '/<img src=x onerror=alert(1)>/', views: 5, visitors: 2, avg_ms: null },
  ],
  referrers: { direct: 70, internal: 400, external: [{ host: 'google.com', views: 55 }] },
  countries: [
    { name: 'JP', views: 800, visitors: 200 },
    { name: 'US', views: 100, visitors: 40 },
  ],
  cities: [{ country: 'JP', city: 'Tokyo', views: 700, visitors: 180 }],
  browsers: [{ name: 'Chrome', views: 900, visitors: 250 }],
  systems: [{ name: 'Windows', views: 700, visitors: 200 }],
  devices: [{ name: 'desktop', views: 900, visitors: 250 }],
  networks: [{ name: 'KDDI', views: 500, visitors: 120 }],
  languages: [{ name: 'ja-JP', views: 600, visitors: 150 }],
  screens: [{ name: '1920x1080', views: 700, visitors: 180 }],
  timezones: [
    { name: 'Asia/Tokyo', views: 800, visitors: 200 },
    { name: 'America/Argentina/ComodRivadavia', views: 40, visitors: 9 },
  ],
  navTypes: [{ name: 'navigate', views: 90, visitors: 80 }],
  utm: {
    sources: [{ name: 'chatgpt.com', views: 12, visitors: 10 }],
    mediums: [{ name: 'referral', views: 12, visitors: 10 }],
    campaigns: [],
  },
  viewportWidths: [{ bucket: 4, views: 60 }],
  scrollBuckets: [
    { bucket: 0, views: 20 },
    { bucket: 4, views: 40 },
  ],
  behavior: {
    interaction: { measured: 100, yes: 79 },
    automation: { measured: 100, yes: 7 },
    touch: { measured: 100, yes: 34 },
    scroll: { measured: 100, average: 65 },
  },
};

export const NOTHING_MEASURED = {
  ...summary,
  navTypes: [],
  utm: { sources: [], mediums: [], campaigns: [] },
  viewportWidths: [],
  scrollBuckets: [],
  behavior: {
    interaction: { measured: 0, yes: 0 },
    automation: { measured: 0, yes: 0 },
    touch: { measured: 0, yes: 0 },
    scroll: { measured: 0, average: null },
  },
};

export const ROWS = '.visits tbody tr:not(.detail-row)';

const visit = (n: number, extra: Record<string, unknown> = {}) => ({
  visitor_id: VISITOR,
  ts: NOW - n * 60_000,
  path: `/posts/p${n}/`,
  referrer: n % 2 ? 'https://www.google.com/search' : '',
  country: 'JP',
  region: 'Tokyo',
  city: 'Tokyo',
  asn: 2516,
  as_org: 'KDDI',
  tz: 'Asia/Tokyo',
  browser: 'Chrome',
  os: 'Windows',
  device: 'desktop',
  screen: '1920x1080',
  viewport: '1280x720',
  dpr: '2',
  touch: 0,
  lang: 'ja-JP',
  nav: 'navigate',
  utm_source: 'chatgpt.com',
  utm_medium: 'referral',
  utm_campaign: '',
  ua: 'Mozilla/5.0 test-agent',
  is_bot: false,
  automation: false,
  interacted: true,
  scroll_pct: 80,
  duration_ms: 5000 * n,
  is_first: n === 1,
  ...extra,
});

const NOT_MEASURED = {
  viewport: '',
  dpr: '',
  touch: null,
  nav: '',
  utm_source: '',
  utm_medium: '',
  automation: null,
  interacted: null,
  scroll_pct: null,
  ua: '',
};
const FIRST_PAGE = [visit(1), visit(2, NOT_MEASURED), visit(3, { is_bot: true, automation: true })];
const SECOND_PAGE = [visit(4), visit(5)];

export async function mockWorker(page: Page, data: object = summary) {
  const requests: URL[] = [];
  await page.route(`https://${HOST}/**`, async (route) => {
    const request: Request = route.request();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });

    const url = new URL(request.url());
    requests.push(url);
    if (request.headers().authorization !== `Bearer ${GOOD}`) return route.fulfill({ status: 401, headers: cors });

    if (url.pathname === '/api/summary') return route.fulfill({ json: data, headers: cors });
    const before = url.searchParams.get('before');
    return route.fulfill({
      json: before ? { visits: SECOND_PAGE, next: null } : { visits: FIRST_PAGE, next: before ? null : 12345 },
      headers: cors,
    });
  });
  return requests;
}

export async function unlock(page: Page, token = GOOD) {
  await page.goto('/stats/');
  await ready(page);
  await page.locator('[data-token]').fill(token);
  await page.locator('[data-gate] button[type="submit"]').click();
}
