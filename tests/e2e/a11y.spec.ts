import { expect, ready, test } from './fixtures';

test.describe('keyboard and screen reader support', () => {
  test('the skip link is the first stop and moves the focus to the content', async ({ page }) => {
    await page.goto('/archives/');
    await ready(page);
    await page.keyboard.press('Tab');
    const link = page.locator('.skip-link');
    await expect(link).toBeFocused();
    expect((await link.boundingBox())!.y).toBeGreaterThanOrEqual(0);

    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('the search keeps the focus inside and gives it back when it closes', async ({ page }) => {
    await page.goto('/about/');
    await ready(page);
    await page.locator('#open-search').focus();
    await page.keyboard.press('Enter');

    const dialog = page.locator('#cmdk');
    await expect(dialog).toBeVisible();
    await expect(page.locator('.layout')).toHaveJSProperty('inert', true);
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#cmdk'))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.locator('.layout')).toHaveJSProperty('inert', false);
    await expect(page.locator('#open-search')).toBeFocused();
  });

  test('the selected search result is announced through aria-activedescendant', async ({ page }) => {
    await page.goto('/about/');
    await ready(page);
    await page.keyboard.press('Control+K');
    const input = page.locator('#cmdk input');
    await expect(input).toHaveAttribute('role', 'combobox');
    await input.fill('waline');
    await expect(page.locator('#cmdk .cmdk-item').first()).toBeVisible();

    await page.keyboard.press('ArrowDown');
    const selected = page.locator('#cmdk .cmdk-item[aria-selected="true"]');
    await expect(selected).toHaveCount(1);
    const id = await selected.getAttribute('id');
    await expect(input).toHaveAttribute('aria-activedescendant', id!);
    await expect(selected).toHaveClass(/on/);
  });

  test('a gallery image opens with the keyboard and the focus returns to it', async ({ page }) => {
    await page.goto('/posts/Odawara/');
    await ready(page);
    const figure = page.locator('.gallery figure').first();
    await figure.scrollIntoViewIfNeeded();
    await figure.focus();
    await expect(figure).toHaveAttribute('role', 'button');

    await page.keyboard.press('Enter');
    const lightbox = page.locator('.lightbox');
    await expect(lightbox).toHaveClass(/open/);
    await expect(lightbox).toHaveJSProperty('inert', false);
    await expect(page.locator('.lb-close')).toBeFocused();
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('.lightbox'))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(lightbox).not.toHaveClass(/open/);
    await expect(lightbox).toHaveJSProperty('inert', true);
    await expect(figure).toBeFocused();
  });

  test('a closed lightbox has nothing the Tab key can reach', async ({ page }) => {
    await page.goto('/posts/Odawara/');
    await ready(page);
    await expect(page.locator('.lightbox')).toHaveJSProperty('inert', true);
  });
});
