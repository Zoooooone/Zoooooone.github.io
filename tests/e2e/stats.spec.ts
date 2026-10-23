import { expect, horizontalOverflow, ready, test } from './fixtures';
import { mockWorker, NOTHING_MEASURED, ROWS, summary, unlock, VISITOR } from './stats-fixtures';

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
    await expect(kpis).toHaveText(['1,234', '321', '200', '3m 12s', '79%', '65%', '7%', '34%']);
    await expect(page.locator('.heat tbody tr')).toHaveCount(7);
    await expect(page.locator('.heat td[data-level="4"]')).toHaveCount(1);
    await expect(page.locator('[data-daily] svg rect.bar-views')).toHaveCount(30);
    await expect(page.locator('[data-pages] .rank li')).toHaveCount(2);
    await expect(page.locator('[data-sources]')).toContainText('google.com');
    await expect(page.locator('[data-sources]')).toContainText('直接访问 70 · 站内跳转 400');
    await expect(page.locator('[data-places]')).toContainText('日本');
    await expect(page.locator(ROWS)).toHaveCount(3);
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
    await expect(page.locator(ROWS)).toHaveCount(3);

    await page.locator('.visits [data-filter="path"]').first().click();
    await expect(page.locator('.chip')).toContainText('页面 /posts/p1/');
    await expect
      .poll(() => requests.some((u) => u.pathname === '/api/visits' && u.searchParams.get('path') === '/posts/p1/'))
      .toBe(true);

    await page.locator('.chip [data-clear]').click();
    await expect(page.locator('.chip')).toHaveCount(0);

    await page.locator('[data-more]').click();
    await expect(page.locator(ROWS)).toHaveCount(5);
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

  test('keeps long names clear of the bar next to them', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await expect(page.locator('[data-places]')).toContainText('America/Argentina/ComodRivadavia');

    // The text is measured with a range because a plain-text label has no element of its own to measure.
    const overlaps = await page.evaluate(
      () =>
        [...document.querySelectorAll('.rank li')].filter((item) => {
          const label = item.querySelector('.rank-label')!;
          const bar = item.querySelector('.rank-bar')!;
          const range = document.createRange();
          range.selectNodeContents(label.firstChild!);
          const text = range.getBoundingClientRect();
          return (
            text.right > bar.getBoundingClientRect().left + 1 || text.right > label.getBoundingClientRect().right + 1
          );
        }).length,
    );
    expect(overlaps).toBe(0);
    await expect(page.locator('[data-places] .rank-label wbr').first()).toBeAttached();
  });

  test('lists the networks, languages, screens, scroll steps and how visitors arrived', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await expect(page.locator('[data-places]')).toContainText('KDDI');
    await expect(page.locator('[data-places]')).toContainText('Asia/Tokyo');
    await expect(page.locator('[data-devices]')).toContainText('1920x1080');
    await expect(page.locator('[data-devices]')).toContainText('≥1200');
    await expect(page.locator('[data-devices]')).toContainText('ja-JP');
    await expect(page.locator('[data-behavior]')).toContainText('0–24%');
    await expect(page.locator('[data-behavior]')).toContainText('100%');
    await expect(page.locator('[data-behavior]')).toContainText('新打开');
    await expect(page.locator('[data-behavior] .rank li').first().locator('.rank-num')).toHaveText('100%');
    await expect(page.locator('[data-sources]')).toContainText('chatgpt.com');
  });

  test('shows device, browser and system as shares of the whole', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    const shares = page.locator('[data-devices] .share');
    await expect(shares).toHaveCount(3);
    await expect(shares.first().locator('.share-legend')).toContainText(/desktop\s*73%/);
    await expect(shares.first().locator('.share-legend')).toContainText(/其他\s*27%/);

    await expect(shares.first().locator('.slice.other')).toHaveCSS('background-image', /repeating-linear-gradient/);

    await shares.first().locator('.slice').first().hover();
    await expect(page.locator('.stats-tip')).toHaveText('desktop · 900 次访问 · 73%');
  });

  test('draws window width and scroll depth as columns in order', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    const widths = page.locator('[data-devices] .columns li');
    await expect(widths).toHaveCount(6);
    await expect(widths.nth(0).locator('.col-value')).toHaveText('0%');
    await expect(widths.nth(4).locator('.col-value')).toHaveText('100%');
    await expect(widths.nth(4).locator('.col-label')).toHaveText('≥1200');
    await widths.nth(4).hover();
    await expect(page.locator('.stats-tip')).toHaveText('1200–1599 · 60 次访问 · 100%');

    const depth = page.locator('[data-behavior] .columns li');
    await expect(depth).toHaveCount(5);
    await expect(depth.nth(0).locator('.col-value')).toHaveText('33%');
    await expect(depth.nth(4).locator('.col-value')).toHaveText('67%');
  });

  test('folds the tail of the screen and language lists into other, with percentages', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    const screens = page.locator('[data-devices] .stats-split > div', { hasText: '屏幕尺寸' }).locator('.rank li');
    await expect(screens).toHaveCount(2);
    await expect(screens.nth(0)).toContainText('1920x1080');
    await expect(screens.nth(0).locator('.rank-num')).toHaveText('57%');
    await expect(screens.nth(1)).toContainText('其他');
    await expect(screens.nth(1).locator('.rank-num')).toHaveText('43%');

    const languages = page.locator('[data-devices] .stats-split > div', { hasText: '语言' }).locator('.rank li');
    await expect(languages.nth(0)).toContainText('ja-JP');
    await expect(languages.nth(0).locator('.rank-num')).toHaveText('49%');
  });

  test('lines the window width columns up with the bottom of the tallest list beside them', async ({ page }) => {
    const sizes = ['1920x1080', '1440x900', '390x844', '412x915', '1710x1112', '2560x1440', '360x800'];
    const tall = { ...summary, screens: sizes.map((name, i) => ({ name, views: 100 - i * 10, visitors: 10 })) };
    await mockWorker(page, tall);
    await unlock(page);
    await expect(page.locator('[data-devices] .columns')).toBeVisible();

    const gap = await page.evaluate(() => {
      const columns = document.querySelector('[data-devices] .columns')!.getBoundingClientRect();
      const screens = [...document.querySelectorAll('[data-devices] .stats-split > div')]
        .find((group) => group.textContent?.includes('屏幕尺寸'))!
        .querySelector('.rank')!
        .getBoundingClientRect();
      return { columns: columns.bottom, screens: screens.bottom, height: columns.height };
    });
    expect(gap.height).toBeGreaterThan(176);
    expect(Math.abs(gap.columns - gap.screens)).toBeLessThan(1);
  });

  test('keeps the toolbar controls from overlapping', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await expect(page.locator('.toolbar .check').first()).toBeVisible();

    // A control squeezed to nothing keeps its buttons drawn outside its own box, so the content is measured too.
    const overlaps = await page.evaluate(() => {
      const edges = [...document.querySelectorAll('.toolbar > *')]
        .map((el) => ({
          left: el.getBoundingClientRect().left,
          right: el.getBoundingClientRect().left + el.scrollWidth,
        }))
        .filter((edge) => edge.right > edge.left)
        .sort((a, b) => a.left - b.left);
      return edges.filter((edge, i) => i > 0 && edge.left < edges[i - 1].right - 0.5).length;
    });
    expect(overlaps).toBe(0);
    expect((await page.locator('.toolbar .seg').boundingBox())!.width).toBeGreaterThan(100);
  });

  test('draws every bar with the same thickness', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await expect(page.locator('.columns .col-bar').first()).toBeVisible();

    const sizes = await page.evaluate(() => {
      const measure = (selector: string, side: 'width' | 'height') =>
        [...document.querySelectorAll(selector)].map((el) => el.getBoundingClientRect()[side]);
      return {
        share: measure('.share-bar', 'height'),
        rank: measure('.rank-bar', 'height'),
        column: measure('.col-bar', 'width'),
      };
    });
    const all = [...sizes.share, ...sizes.rank, ...sizes.column];
    expect(sizes.share.length).toBeGreaterThan(0);
    expect(sizes.rank.length).toBeGreaterThan(0);
    expect(sizes.column.length).toBeGreaterThan(0);
    for (const size of all) expect(Math.abs(size - all[0])).toBeLessThan(0.5);
    // As thin as the ranking bars have always been on the live site.
    expect(all[0]).toBeLessThanOrEqual(4);
  });

  test('says so when a signal was not measured, instead of showing zero', async ({ page }) => {
    await mockWorker(page, NOTHING_MEASURED);
    await unlock(page);
    await expect(page.locator('.kpi b')).toHaveText(['1,234', '321', '200', '3m 12s', '—', '—', '—', '—']);
    await expect(page.locator('.kpi', { hasText: 'INTERACTED' })).toContainText('开始采集之后');
    await expect(page.locator('[data-behavior]')).toContainText('开始采集之后');
  });

  test('opens a visit to show every field, and closes it again', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    const toggle = page.locator('.expand').first();
    const detail = page.locator('.detail-row').first();
    await expect(detail).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(detail).toBeVisible();
    for (const text of [
      '完整时间',
      '浏览器标识',
      'Mozilla/5.0 test-agent',
      '真实互动',
      '滚动深度',
      '自动化标记',
      'AS2516',
      '1280x720',
      '像素密度',
    ]) {
      await expect(detail).toContainText(text);
    }

    await toggle.click();
    await expect(detail).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('shows a dash for what an older visit never reported', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    const second = page.locator(ROWS).nth(1);
    await expect(second.locator('td').nth(-2)).toHaveText('—');
    await expect(second.locator('td').nth(-1)).toHaveText('—');
  });

  test('marks a visit whose browser looks automated', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await expect(page.locator('.visits .tag.auto')).toHaveCount(1);
    await expect(page.locator(ROWS).nth(2)).toContainText('AUTO');
  });

  test('adds up one visitor when their visits are opened', async ({ page }) => {
    await mockWorker(page);
    await unlock(page);
    await page.locator('.visits [data-filter="visitor"]').first().click();
    await expect(page.locator('[data-visitor]')).toContainText('共 3 次访问');
    await expect(page.locator('[data-visitor]')).toContainText(VISITOR);
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
    await expect(page.locator(ROWS)).toHaveCount(3);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});
