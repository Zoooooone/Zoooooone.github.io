import type { Page } from '@playwright/test';
import { expect, ready, test } from './fixtures';

// Headless Chrome hides scrollbars by default; the layout shift only exists with visible, space-taking ones.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

test.describe('scroll locking', () => {
  const positions = (page: Page) =>
    page.evaluate(() => {
      const sheet = document.querySelector('.sheet')!.getBoundingClientRect();
      return {
        rail: document.querySelector('#rail')!.getBoundingClientRect().left,
        sheetLeft: sheet.left,
        sheetWidth: sheet.width,
        bodyWidth: document.body.getBoundingClientRect().width,
      };
    });

  test('opening the search does not shift the page', async ({ page }) => {
    await page.goto('/archives/');
    await ready(page);
    const before = await positions(page);
    await page.keyboard.press('Control+K');
    await expect(page.locator('#cmdk')).toBeVisible();
    expect(await positions(page)).toEqual(before);
    await page.keyboard.press('Escape');
    expect(await positions(page)).toEqual(before);
  });

  test('opening the lightbox does not shift the page', async ({ page }) => {
    await page.goto('/posts/Odawara/');
    await ready(page);
    const first = page.locator('.gallery figure').first();
    await first.scrollIntoViewIfNeeded();
    const before = await positions(page);
    await first.click();
    await expect(page.locator('.lightbox')).toBeVisible();
    expect(await positions(page)).toEqual(before);
  });
});
