import type { Page, Request } from '@playwright/test';
import { analytics } from '../../src/config/site';
import { expect, horizontalOverflow, ready, test } from './fixtures';

const HOST = new URL(analytics.endpoint).hostname;
const GOOD = 'good-token';
const VISITOR = 'a'.repeat(32);
const NOW = Date.now();

const summary = {
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
};

const visit = (n: number, extra: Record<string, unknown> = {}) => ({
  visitor_id: VISITOR,
  ts: NOW - n * 60_000,
  path: `/posts/p${n}/`,
  referrer: n % 2 ? 'https://www.google.com/search' : '',
  country: 'JP',
  region: 'Tokyo',
  city: 'Tokyo',
  as_org: 'KDDI',
  browser: 'Chrome',
  os: 'Windows',
  device: 'desktop',
  screen: '1920x1080',
  lang: 'ja',
  is_bot: false,
  duration_ms: 5000 * n,
  is_first: n === 1,
  ...extra,
});

const FIRST_PAGE = [visit(1), visit(2), visit(3, { is_bot: true })];
const SECOND_PAGE = [visit(4), visit(5)];

async function mockWorker(page: Page) {
  const requests: URL[] = [];
  await page.route(`https://${HOST}/**`, async (route) => {
    const request: Request = route.request();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });

    const url = new URL(request.url());
    requests.push(url);
    if (request.headers().authorization !== `Bearer ${GOOD}`) return route.fulfill({ status: 401, headers: cors });

    if (url.pathname === '/api/summary') return route.fulfill({ json: summary, headers: cors });
    const before = url.searchParams.get('before');
    return route.fulfill({
      json: before ? { visits: SECOND_PAGE, next: null } : { visits: FIRST_PAGE, next: before ? null : 12345 },
      headers: cors,
    });
  });
  return requests;
}

async function unlock(page: Page, token = GOOD) {
  await page.goto('/stats/');
  await ready(page);
  await page.locator('[data-token]').fill(token);
  await page.locator('[data-gate] button[type="submit"]').click();
}

test.describe('stats page', () => {
  test('is kept out of search engines', async ({ page }) => {
    await page.goto('/stats/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const robots = await (await page.request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /stats/');
  });

  test('asks for the token first and keeps the data hidden', async ({ page }) => {
    await mockWorker(page);
    await page.goto('/stats/');
    await ready(page);
    await expect(page.locator('[data-gate]')).toBeVisible();
    await expect(page.locator('[data-dashboard]')).toBeHidden();
  });

  test('rejects a wrong token with a message and stores nothing', async ({ page }) => {
    await mockWorker(page);
    await unlock(page, 'nope');
    await expect(page.locator('[data-gate-error]')).toHaveText('口令不正确');
    await expect(page.locator('[data-gate]')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('stats-token'))).toBeNull();
  });

  test('shows the numbers after unlocking and remembers the token', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);

    const kpis = page.locator('.kpi b');
    await expect(kpis).toHaveText(['1,234', '321', '200', '3m 12s']);
    await expect(page.locator('.heat tbody tr')).toHaveCount(7);
    await expect(page.locator('.heat td[data-level="4"]')).toHaveCount(1);
    await expect(page.locator('[data-daily] svg rect.bar-views')).toHaveCount(30);
    await expect(page.locator('[data-pages] .rank li')).toHaveCount(2);
    await expect(page.locator('[data-sources]')).toContainText('google.com');
    await expect(page.locator('[data-sources]')).toContainText('直接访问 70 · 站内跳转 400');
    await expect(page.locator('[data-places]')).toContainText('日本');
    await expect(page.locator('.visits tbody tr')).toHaveCount(3);
    await expect(page.locator('.visits [data-filter="visitor"]').first()).toHaveText(/^\D{2}\d{2}$/);
    await expect(page.locator('.visits .tag', { hasText: 'NEW' })).toHaveCount(1);
    await expect(page.locator('.visits .tag.bot')).toHaveCount(1);

    await expect(page.locator('[data-gate]')).toBeHidden();

    await page.reload();
    await ready(page);
    await expect(page.locator('[data-dashboard]')).toBeVisible();
    await expect(page.locator('[data-gate]')).toBeHidden();
    await expect(page.locator('.kpi b').first()).toHaveText('1,234');
  });

  test('shows server text as text and never as markup', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await expect(page.locator('[data-pages]')).toContainText('<img src=x onerror=alert(1)>');
    await expect(page.locator('[data-pages] img')).toHaveCount(0);
  });

  test('reloads the numbers for another range and for crawlers', async ({ page }) => {
    const requests = await mockWorker(page);
    await unlock(page);
    await expect(page.locator('.kpi b').first()).toHaveText('1,234');

    await page.locator('[data-days="90"]').click();
    await expect(page.locator('[data-days="90"]')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => requests.some((u) => u.searchParams.get('days') === '90')).toBe(true);

    await page.locator('[data-bots]').check();
    await expect.poll(() => requests.some((u) => u.searchParams.get('bots') === '1')).toBe(true);
  });

  test('filters the visit list from a page, can undo it, and loads more', async ({ page }) => {
    const requests = await mockWorker(page);
    await unlock(page);
    await expect(page.locator('.visits tbody tr')).toHaveCount(3);

    await page.locator('.visits [data-filter="path"]').first().click();
    await expect(page.locator('.chip')).toContainText('页面 /posts/p1/');
    await expect
      .poll(() => requests.some((u) => u.pathname === '/api/visits' && u.searchParams.get('path') === '/posts/p1/'))
      .toBe(true);

    await page.locator('.chip [data-clear]').click();
    await expect(page.locator('.chip')).toHaveCount(0);

    await page.locator('[data-more]').click();
    await expect(page.locator('.visits tbody tr')).toHaveCount(5);
    await expect(page.locator('[data-more]')).toBeHidden();
    expect(requests.some((u) => u.searchParams.get('before') === '12345')).toBe(true);
  });

  test('shows a tooltip when pointing at a day or a heatmap cell', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    const tip = page.locator('.stats-tip');
    await expect(tip).toBeHidden();

    await page.locator('[data-daily] .hit').nth(5).hover();
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('次访问');

    await page.locator('.heat td[data-level="4"]').hover();
    await expect(tip).toHaveText('周一 21:00 · 40 次访问');

    await page.locator('h1').hover();
    await expect(tip).toBeHidden();
  });

  test('brings the visit list into view when a ranked page is clicked', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await expect(page.locator('[data-pages] [data-filter="path"]').first()).toBeVisible();
    await expect(page.locator('[data-visits-panel]')).not.toBeInViewport();

    await page.locator('[data-pages] [data-filter="path"]').first().click();
    await expect(page.locator('.chip')).toContainText('页面 /posts/docker/');
    await expect(page.locator('[data-visits-panel]')).toBeInViewport();
  });

  test('does the same for a country in the places list', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await page.locator('[data-places] [data-filter="country"]').first().click();
    await expect(page.locator('.chip')).toContainText('地区 日本');
    await expect(page.locator('[data-visits-panel]')).toBeInViewport();
  });

  test('opens one visitor across all time', async ({ page }) => {
    const requests = await mockWorker(page);
    await unlock(page);
    await page.locator('.visits [data-filter="visitor"]').first().click();
    await expect(page.locator('.chip')).toContainText(/访客 \D{2}\d{2} · aaaaaaaa/);
    await expect
      .poll(() => requests.some((u) => u.searchParams.get('visitor') === VISITOR && u.searchParams.get('days') === '0'))
      .toBe(true);
  });

  test('signs out and asks for the token again', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await expect(page.locator('[data-dashboard]')).toBeVisible();
    await page.locator('[data-signout]').click();
    await expect(page.locator('[data-gate]')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('stats-token'))).toBeNull();
  });

  test('is not counted as a visit by the tracker', async ({ page }) => {
    const requests = await mockWorker(page);
    await unlock(page);
    await expect(page.locator('.kpi b').first()).toHaveText('1,234');
    expect(requests.filter((u) => !u.pathname.startsWith('/api/'))).toEqual([]);
  });

  test('fits a phone without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockWorker(page);
    await unlock(page);
    await expect(page.locator('.visits tbody tr')).toHaveCount(3);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});
