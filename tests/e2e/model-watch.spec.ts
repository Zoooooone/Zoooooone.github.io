import type { Page } from '@playwright/test';
import { analytics } from '../../src/config/site';
import { expect, horizontalOverflow, ready, test } from './fixtures';

const HOST = new URL(analytics.endpoint).hostname;
const GOOD = 'good-token';
const NOW = Date.now();

const llm = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: `Model ${id}`,
  slug: id,
  creator_id: 'acme',
  creator: 'Acme',
  release_date: '2026-09-01',
  intelligence: 40,
  coding: 30,
  math: 50,
  price_blended: 2,
  price_input: 1,
  price_output: 4,
  tps: 100,
  ttft: 0.5,
  ttfat: 0.5,
  evaluations: { gpqa: 0.5, hle: 0.2 },
  ...over,
});

const media = (id: string, rank: number, elo: number) => ({
  id,
  name: `Clip ${id}`,
  slug: id,
  creator: 'Pixel Co',
  release_date: '2026-08',
  elo,
  rank,
  ci95: '-10/10',
  appearances: 2000,
  categories: [{ style_category: 'Anime', subject_matter_category: null, format_category: null, elo: 2000 - elo }],
});

const latest = {
  boards: [
    { board: 'llm', day: '2026-10-24', fetched_at: NOW, models: 5 },
    { board: 'text-to-image', day: '2026-10-24', fetched_at: NOW, models: 2 },
    { board: 'text-to-video', day: '2026-10-23', fetched_at: NOW, models: 2 },
  ],
  runs: [
    { board: 'text-to-video', ts: NOW, ok: 0, models: null, error: 'HTTP 500' },
    { board: 'llm', ts: NOW - 1000, ok: 1, models: 5, error: '' },
  ],
  daily: [
    { day: '2026-10-23', top: 59, models: 4 },
    { day: '2026-10-24', top: 60, models: 5 },
  ],
  llm: [
    llm('nova-max', { name: 'Nova (Max)', intelligence: 60, price_blended: 10, tps: 50, release_date: '2026-10-01' }),
    llm('nova-low', { name: 'Nova (Low)', intelligence: 45, price_blended: 1, tps: 300, release_date: '2026-10-01' }),
    llm('swift', {
      name: 'Swift',
      creator: 'Bolt',
      intelligence: 50,
      price_blended: 0.5,
      tps: 200,
      release_date: '2025-06-10',
    }),
    llm('old', {
      name: 'Elder',
      creator: 'Bolt',
      intelligence: 20,
      price_blended: null,
      tps: null,
      release_date: '2024-01-05',
    }),
    llm('xss', { name: '<img src=x onerror=alert(1)>', creator: 'Bolt', intelligence: 10, release_date: '2024-03-05' }),
  ],
  media: {
    'text-to-image': [media('a', 1, 1200), media('b', 2, 1100)],
    'text-to-video': [media('c', 1, 1150), media('d', 2, 1050)],
  },
};

const changes = (days: number, metric = 'intelligence') => ({
  days,
  llm: {
    from: '2026-10-17',
    to: '2026-10-24',
    partial: days > 7,
    metric,
    added: [{ id: 'nova-max', name: 'Nova (Max)', creator: 'Acme', release_date: '2026-10-01', was: null, now: 60 }],
    removed: [],
    rescored: [
      {
        id: 'swift',
        name: 'Swift',
        creator: 'Bolt',
        release_date: '2025-06-10',
        was: 48,
        now: 50,
        was_metric: metric === 'gpqa' ? 0.4 : 48,
        now_metric: metric === 'gpqa' ? 0.5 : 50,
      },
    ],
    repriced: [
      {
        id: 'swift',
        name: 'Swift',
        creator: 'Bolt',
        release_date: '2025-06-10',
        was: 50,
        now: 50,
        was_price: 1,
        now_price: 0.5,
      },
    ],
  },
  // Only one arena has two days of snapshots so far.
  media: {
    'text-to-image': {
      from: '2026-10-17',
      to: '2026-10-24',
      partial: false,
      added: [],
      removed: [],
      moved: [{ id: 'a', name: 'Clip a', creator: 'Pixel Co', was_rank: 3, now_rank: 1, was: 1180, now: 1200 }],
    },
  },
});

const history = {
  id: 'swift',
  days: [
    { day: '2026-10-23', name: 'Swift', intelligence: 48, price_blended: 1 },
    { day: '2026-10-24', name: 'Swift', intelligence: 50, price_blended: 0.5 },
  ],
};

async function mockWorker(
  page: Page,
  { noHistory = false, snapshot = latest }: { noHistory?: boolean; snapshot?: typeof latest } = {},
) {
  const requests: URL[] = [];
  await page.route(`https://${HOST}/**`, async (route) => {
    const request = route.request();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const url = new URL(request.url());
    requests.push(url);
    if (request.headers().authorization !== `Bearer ${GOOD}`) return route.fulfill({ status: 401, headers: cors });
    if (url.pathname === '/api/models/latest') return route.fulfill({ json: snapshot, headers: cors });
    if (url.pathname === '/api/models/changes') {
      const days = Number(url.searchParams.get('days'));
      const metric = url.searchParams.get('metric') ?? undefined;
      return route.fulfill({
        json: noHistory ? { days, llm: null, media: {} } : changes(days, metric),
        headers: cors,
      });
    }
    if (url.pathname === '/api/models/history') return route.fulfill({ json: history, headers: cors });
    return route.fulfill({ status: 404, headers: cors });
  });
  return requests;
}

async function unlock(page: Page, token = GOOD) {
  await page.goto('/model-watch/');
  await ready(page);
  await page.locator('[data-token]').fill(token);
  await page.locator('[data-gate] button[type="submit"]').click();
}

const leaderboard = (page: Page) => page.locator('[data-board] .rank li');

test.describe('model watch page', () => {
  test('is kept out of search engines', async ({ page }) => {
    await page.goto('/model-watch/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const robots = await (await page.request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /model-watch/');
  });

  test('asks for the token and rejects a wrong one', async ({ page }) => {
    await mockWorker(page);
    await unlock(page, 'nope');
    await expect(page.locator('[data-gate-error]')).toHaveText('口令不正确');
    await expect(page.locator('[data-dashboard]')).toBeHidden();
  });

  test('shares the token with the stats page', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await expect(page.locator('.kpi b').first()).toHaveText('5');
    expect(await page.evaluate(() => localStorage.getItem('stats-token'))).toBe(GOOD);
  });

  test('shows the overview, changes and every panel', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await expect(page.locator('.kpi b')).toHaveText(['5', '2', '60.0', '30.0', '$10.0', '200 t/s', '1200', '1150']);
    await expect(page.locator('[data-status]')).toContainText('DATA 2026-10-24');
    await expect(page.locator('[data-warn]')).toContainText('文生视频 最近一次拉取失败：HTTP 500');
    await expect(page.locator('[data-changes]')).toContainText('2026-10-17 → 2026-10-24');
    await expect(page.locator('[data-changes]')).toContainText('−50%');
    await expect(page.locator('[data-value] .pt')).toHaveCount(3);
    await expect(page.locator('[data-value] .pt.best')).toHaveCount(2);
    await expect(page.locator('[data-frontier] .pt')).toHaveCount(4);
    await expect(page.locator('[data-creators] .rank li')).toHaveCount(2);
    await expect(page.locator('.source a')).toHaveAttribute('href', 'https://artificialanalysis.ai/');
  });

  test('ranks by any metric and hides models without a price unless asked', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await expect(leaderboard(page)).toHaveCount(3);
    await expect(leaderboard(page).first()).toContainText('Nova');
    await expect(leaderboard(page).first()).toContainText('档位 Max');

    await page.locator('[data-metric]').selectOption('price_blended');
    await expect(leaderboard(page).first()).toContainText('Swift');
    await expect(leaderboard(page).first().locator('.rank-num')).toHaveText('$0.50');

    await page.locator('[data-merge]').uncheck();
    await expect(leaderboard(page)).toHaveCount(4);
    await page.locator('[data-unlisted]').check();
    await page.locator('[data-metric]').selectOption('gpqa');
    await expect(leaderboard(page)).toHaveCount(5);
    await expect(leaderboard(page).first().locator('.rank-num')).toHaveText('50.0%');
  });

  test('opens a model in a row right under it, with its numbers and history, and closes it again', async ({ page }) => {
    const requests = await mockWorker(page);
    await unlock(page);
    const button = page.locator('[data-changes] [data-model="swift"]').first();
    await button.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => scrollY);

    await button.click();
    const row = button.locator('xpath=ancestor::li[1]/following-sibling::li[1]');
    await expect(row).toHaveClass(/detail-row/);
    await expect(row).toContainText('GPQA Diamond');
    await expect(row.locator('.spark')).toHaveCount(2);
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(requests.some((u) => u.pathname === '/api/models/history' && u.searchParams.get('id') === 'swift')).toBe(
      true,
    );
    // It opens where the model is, instead of taking the page somewhere else.
    expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(2);

    await button.click();
    await expect(page.locator('.detail-row')).toHaveCount(0);
    await expect(button).toHaveAttribute('aria-expanded', 'false');

    await button.click();
    await row.locator('[data-close-detail]').click();
    await expect(page.locator('.detail-row')).toHaveCount(0);
  });

  test('opens a ranked model under its own row and keeps only one open', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await expect(leaderboard(page)).toHaveCount(3);
    await page.locator('[data-board] [data-model]').nth(1).click();
    await expect(leaderboard(page)).toHaveCount(4);
    await expect(leaderboard(page).nth(2)).toHaveClass(/detail-row/);
    await expect(leaderboard(page).nth(1)).toContainText('Swift');

    await page.locator('[data-board] [data-model]').first().click();
    await expect(page.locator('.detail-row')).toHaveCount(1);
    await expect(leaderboard(page).nth(1)).toHaveClass(/detail-row/);
  });

  test('keeps a row for each arena in the changes, even one without two days of snapshots', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    const changes = page.locator('[data-changes]');
    await expect(changes).toContainText('语言模型 · LLM');
    await expect(changes).toContainText('媒体竞技场 · ARENAS');
    for (const arena of ['文生图', '图像编辑', '文生语音', '文生视频', '图生视频']) {
      await expect(changes).toContainText(arena);
    }
    await expect(changes).toContainText('Clip a');
    await expect(changes.getByText('还没有两天的快照')).toHaveCount(4);
  });

  test('compares any metric in the changes, not only the intelligence index', async ({ page }) => {
    const requests = await mockWorker(page);
    await unlock(page);
    await expect(page.locator('[data-changes]')).toContainText('智能指数变动 · 1');
    await expect(page.locator('[data-changes]')).toContainText('48.0 → 50.0');

    await page.locator('[data-change-metric]').selectOption('gpqa');
    await expect(page.locator('[data-changes]')).toContainText('GPQA Diamond变动 · 1');
    await expect(page.locator('[data-changes]')).toContainText('40.0% → 50.0%');
    expect(requests.some((u) => u.pathname === '/api/models/changes' && u.searchParams.get('metric') === 'gpqa')).toBe(
      true,
    );
  });

  test('labels only the frontier, and explains the frontier line', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    const chart = page.locator('[data-value]');
    await expect(chart.locator('.dot-label')).toHaveText(['Nova', 'Swift']);
    await expect(chart.locator('.stats-note')).toContainText('阶梯线');
    // Two frontier models make three corners of a staircase: along, then up.
    const corners = await chart.locator('polyline.front').getAttribute('points');
    expect(corners!.trim().split(/\s+/)).toHaveLength(3);

    // Drawn at the size of its panel, so text and dots are not scaled up or down.
    const scale = await chart.locator('svg.scatter').evaluate((el) => {
      const box = el.getBoundingClientRect();
      return box.width / Number(el.getAttribute('width'));
    });
    expect(Math.abs(scale - 1)).toBeLessThan(0.02);
  });

  test('keeps every label clear of the others and of the dots', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    for (const selector of ['[data-value]', '[data-speed]', '[data-frontier]']) {
      const overlaps = await page.evaluate((chart) => {
        const root = document.querySelector(chart)!;
        const labels = [...root.querySelectorAll('.dot-label')].map((el) => el.getBoundingClientRect());
        const dots = [...root.querySelectorAll('.pt .dot')].map((el) => el.getBoundingClientRect());
        const hits = (a: DOMRect, b: DOMRect) =>
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        return {
          labels: labels.filter((a, i) => labels.slice(i + 1).some((b) => hits(a, b))).length,
          dots: labels.filter((a) => dots.some((d) => hits(a, d))).length,
        };
      }, selector);
      expect(overlaps, selector).toEqual({ labels: 0, dots: 0 });
    }
  });

  test('names a point under the pointer in a card beside it', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    const card = page.locator('[data-value] .hover-card');
    await expect(card).toBeHidden();

    // The model without a permanent label: it can only be told apart by hovering.
    const plain = page.locator('[data-value] .pt.plain');
    await expect(plain).toHaveCount(1);
    await plain.hover({ force: true });
    await expect(card).toBeVisible();
    await expect(card.locator('.card-name')).toHaveText('<img src=x onerror=alert(1)>');
    await expect(card.locator('.card-line')).toContainText('Bolt · 智能 10.0');
    await expect(plain).toHaveClass(/hot/);

    await page.locator('h1').hover();
    await expect(card).toBeHidden();
  });

  test('picks a model by clicking its point: it stays marked in both charts and its details open under the chart', async ({
    page,
  }) => {
    const requests = await mockWorker(page);
    await unlock(page);
    await page
      .locator('[data-value] .pt.best')
      .filter({ has: page.locator('.dot') })
      .first()
      .click({ force: true });

    await expect(page.locator('[data-value] .pt.pinned')).toHaveCount(1);
    await expect(page.locator('[data-speed] .pt.pinned')).toHaveCount(1);
    const row = page.locator('[data-value] .chart-slot .detail-row');
    await expect(row).toContainText('GPQA Diamond');
    await expect(row.locator('.spark')).toHaveCount(2);
    await expect(page.locator('[data-speed] .chart-slot .detail-row')).toHaveCount(0);
    expect(requests.some((u) => u.pathname === '/api/models/history')).toBe(true);

    await page.locator('[data-value] .pt.pinned').click({ force: true });
    await expect(page.locator('.pt.pinned')).toHaveCount(0);
    await expect(page.locator('.detail-row')).toHaveCount(0);
  });

  test('keeps a model picked in a list marked in the charts', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await page.locator('[data-board] [data-model="swift"]').click();
    await expect(page.locator('[data-value] .pt.pinned')).toHaveCount(1);
    await expect(page.locator('[data-board] .detail-row')).toHaveCount(1);
    await page.locator('[data-board] .detail-row [data-close-detail]').click();
    await expect(page.locator('.pt.pinned')).toHaveCount(0);
  });

  test('lights one creator from the legend and fades the rest', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    const chips = page.locator('[data-value] .creators .pick-chip');
    await expect(chips).toHaveText(['全部', 'Bolt', 'Acme']);
    await expect(page.locator('[data-value] .pt.dim')).toHaveCount(0);

    await chips.filter({ hasText: 'Acme' }).click();
    await expect(page.locator('[data-value] .pt.lit')).toHaveCount(1);
    await expect(page.locator('[data-value] .pt.dim')).toHaveCount(2);
    await expect(page.locator('[data-value] .dot-label')).toHaveText(['Nova']);
    await expect(page.locator('[data-speed] .pt.lit')).toHaveCount(1);
    await expect(page.locator('[data-value] .pick-chip[aria-pressed="true"]')).toHaveText('Acme');

    await page.locator('[data-value] .pick-chip', { hasText: '全部' }).click();
    await expect(page.locator('[data-value] .pt.dim')).toHaveCount(0);
  });

  test('draws the charts again when the page gets much narrower', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    const width = () => page.locator('[data-value] svg.scatter').getAttribute('width');
    const wide = Number(await width());
    await page.setViewportSize({ width: 700, height: 900 });
    await expect.poll(async () => Number(await width())).toBeLessThan(wide - 100);
    await expect(page.locator('[data-value] .dot-label').first()).toBeVisible();
  });

  test('draws the frontier over time for any value that gets better as it grows', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    const select = page.locator('[data-frontier-metric]');
    await expect(select.locator('option[value="price_blended"]')).toHaveCount(0);
    await expect(select.locator('option[value="tps"]')).toHaveCount(1);

    await select.selectOption('hle');
    await expect(page.locator('[data-frontier] svg.scatter')).toHaveAttribute('aria-label', /Humanity's Last Exam/);
    await expect(page.locator('[data-frontier] .stats-note')).toContainText('Humanity');
    await expect(page.locator('[data-frontier] .pt')).toHaveCount(4);
  });

  test('warns when the snapshots have stopped coming, and stays quiet while they are fresh', async ({ page }) => {
    const tokyoDay = (daysAgo: number) =>
      new Date(Date.now() + 9 * 3600_000 - daysAgo * 86_400_000).toISOString().slice(0, 10);
    const dated = (daysAgo: number) => ({
      ...latest,
      runs: [],
      boards: latest.boards.map((b) => ({ ...b, day: tokyoDay(daysAgo) })),
    });

    await mockWorker(page, { snapshot: dated(3) });
    await unlock(page);
    await expect(page.locator('[data-warn] p')).toHaveCount(3);
    await expect(page.locator('[data-warn]')).toContainText('语言模型 已经 3 天没有更新');

    await page.unrouteAll();
    await mockWorker(page, { snapshot: dated(0) });
    await page.locator('[data-refresh]').click();
    await expect(page.locator('[data-status]')).toContainText(`DATA ${tokyoDay(0)}`);
    await expect(page.locator('[data-warn] p')).toHaveCount(0);
  });

  test('compares over a longer range on request', async ({ page }) => {
    const requests = await mockWorker(page);
    await unlock(page);
    await page.locator('[data-days="30"]').click();
    await expect(page.locator('[data-changes]')).toContainText('还没有 30 天前的快照');
    expect(requests.some((u) => u.searchParams.get('days') === '30')).toBe(true);
  });

  test('says when there is not enough history to compare', async ({ page }) => {
    await mockWorker(page, { noHistory: true });
    await unlock(page);
    await expect(page.locator('[data-changes]')).toContainText('至少要有两天的快照');
  });

  test('switches arenas and their categories', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    const arena = page.locator('[data-media-list] .rank li');
    await expect(arena.first()).toContainText('Clip a');
    await page.locator('[data-media="text-to-video"]').click();
    await expect(arena.first()).toContainText('Clip c');
    await page.locator('[data-category]').selectOption('Anime');
    await expect(arena.first()).toContainText('Clip d');
    await page.locator('[data-media="text-to-speech"]').click();
    await expect(page.locator('[data-media-list]')).toContainText('这个竞技场还没有数据');
  });

  test('shows model names as text and never as markup', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await page.locator('[data-unlisted]').check();
    await expect(page.locator('[data-board]')).toContainText('<img src=x onerror=alert(1)>');
    await expect(page.locator('[data-model-watch] img')).toHaveCount(0);
  });

  test('is not counted as a visit by the tracker', async ({ page }) => {
    const requests = await mockWorker(page);
    await unlock(page);
    await expect(page.locator('.kpi b').first()).toHaveText('5');
    expect(requests.filter((u) => !u.pathname.startsWith('/api/'))).toEqual([]);
  });

  test('fits a phone without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockWorker(page);
    await unlock(page);
    await expect(leaderboard(page).first()).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});
