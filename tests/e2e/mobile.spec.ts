import { expect, horizontalOverflow, ready, test } from './fixtures';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.describe('narrow screens', () => {
  for (const path of ['/', '/posts/waline/', '/archives/', '/categories/', '/about/']) {
    test(`${path} has no horizontal scrolling`, async ({ page }) => {
      await page.goto(path);
      await ready(page);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }

  test('the menu button opens the sidebar drawer and Escape closes it', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/nav-open/);

    await page.locator('#m-menu').click();
    await expect(html).toHaveClass(/nav-open/);
    await expect(page.locator('#m-menu')).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(html).not.toHaveClass(/nav-open/);
    await expect(page.locator('#m-menu')).toHaveAttribute('aria-expanded', 'false');
  });

  test('choosing a page from the drawer navigates and closes it', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await page.locator('#m-menu').click();
    await page.locator('.rail-nav a[href="/archives/"]').click();
    await page.waitForURL((u) => u.pathname === '/archives/');
    await expect(page.locator('html')).not.toHaveClass(/nav-open/);
  });
});

test.describe('bottom bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('player', JSON.stringify({ url: 'space-walk.mp3' })));
  });
  test('hides while scrolling down and returns when scrolling up', async ({ page }) => {
    await page.goto('/posts/waline/');
    await ready(page);
    const html = page.locator('html');
    await expect(html).not.toHaveAttribute('data-bar-hidden', '');

    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(html).toHaveAttribute('data-bar-hidden', '');
    await expect
      .poll(() => page.locator('.topbar').evaluate((el) => el.getBoundingClientRect().top >= window.innerHeight))
      .toBe(true);

    await page.evaluate(() => window.scrollTo(0, 700));
    await expect(html).not.toHaveAttribute('data-bar-hidden', '');
  });

  test('shows only the play button until something has played, then a pill that opens a sheet', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await expect(page.locator('.topbar .pl-cover')).toBeHidden();
    await expect(page.locator('.topbar .pl-play')).toBeVisible();

    await page.evaluate(() => document.getElementById('player')!.setAttribute('data-started', '1'));
    await expect(page.locator('.topbar .pl-cover')).toBeVisible();

    const html = page.locator('html');
    await page.locator('.topbar .pl-expand').click();
    await expect(html).toHaveAttribute('data-player-sheet', '');
    await expect(page.locator('.topbar .pl-next')).toBeVisible();
    await expect(page.locator('.topbar .pl-bar')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(html).not.toHaveAttribute('data-player-sheet', '');
  });
});

test.describe('volume on phones', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('player', JSON.stringify({ url: 'space-walk.mp3' })));
  });
  const startPlayer = (page: import('@playwright/test').Page) =>
    page.evaluate(() => document.getElementById('player')!.setAttribute('data-started', '1'));

  test('the bar has a mute button and the sheet a slider', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await expect(page.locator('.topbar .pl-mute')).toBeHidden();
    await startPlayer(page);
    await expect(page.locator('.topbar .pl-mute')).toBeVisible();
    await expect(page.locator('.topbar .pl-vol-top')).toBeHidden();

    await page.locator('.topbar .pl-expand').click();
    await expect(page.locator('.topbar .pl-vol-top')).toBeVisible();
    await page.locator('.topbar .pl-vol-top').fill('0.3');
    expect(await page.evaluate(() => document.querySelector('audio')!.volume)).toBeCloseTo(0.3, 1);
  });

  test('where the volume cannot be set, only the mute button remains', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(HTMLMediaElement.prototype, 'volume', { get: () => 1, set: () => {}, configurable: true });
    });
    await page.goto('/');
    await ready(page);
    await expect(page.locator('html')).toHaveAttribute('data-volume-fixed', '');
    await startPlayer(page);
    await expect(page.locator('.topbar .pl-mute')).toBeVisible();

    await page.locator('.topbar .pl-expand').click();
    await expect(page.locator('.topbar .pl-vol-top')).toBeHidden();
    await expect(page.locator('.topbar .pl-next')).toBeVisible();
  });
});
