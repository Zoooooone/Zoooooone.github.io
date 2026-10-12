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
