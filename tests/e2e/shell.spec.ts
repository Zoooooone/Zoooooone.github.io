import { expect, horizontalOverflow, navigate, ready, test } from './fixtures';

test.describe('app shell', () => {
  test('home page renders without script errors', async ({ page, errors }) => {
    await page.goto('/');
    await ready(page);
    await expect(page.locator('#rail')).toBeVisible();
    await expect(page.locator('.hero-title')).toContainText(/zone/i);
    await expect(page.locator('.latest')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('unknown paths show the 404 page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist/');
    expect(response?.status()).toBe(404);
    await expect(page.locator('#rail')).toBeVisible();
  });

  test('theme and wallpaper survive client-side navigation and reloads', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const html = page.locator('html');

    const theme = await html.getAttribute('data-theme');
    await page.locator('#theme-toggle').click();
    await expect(html).not.toHaveAttribute('data-theme', theme ?? '');
    const chosenTheme = await html.getAttribute('data-theme');

    await page.locator('#bg-toggle').click();
    const chosenBg = await page.evaluate(() => localStorage.getItem('bg'));
    expect(chosenBg).not.toBeNull();

    await navigate(page, '/archives/');
    await expect(html).toHaveAttribute('data-theme', chosenTheme!);
    await expect(html).toHaveAttribute('data-bg', chosenBg!);

    await page.reload();
    await ready(page);
    await expect(html).toHaveAttribute('data-theme', chosenTheme!);
    await expect(html).toHaveAttribute('data-bg', chosenBg!);
  });

  test('the player and sidebar are kept, not rebuilt, when navigating', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await page.evaluate(() => {
      (document.getElementById('player') as HTMLElement).dataset.marker = 'kept';
      (document.getElementById('rail') as HTMLElement).dataset.marker = 'kept';
    });

    await navigate(page, '/categories/');
    await navigate(page, '/about/');

    await expect(page.locator('#player')).toHaveAttribute('data-marker', 'kept');
    await expect(page.locator('#rail')).toHaveAttribute('data-marker', 'kept');
    await expect(page.locator('.rail-nav a[aria-current="page"]')).toHaveAttribute('href', '/about/');
  });

  test('the command palette opens with Ctrl+K, searches and closes with Escape', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const palette = page.locator('#cmdk');
    await expect(palette).toBeHidden();

    await page.keyboard.press('Control+K');
    await expect(palette).toBeVisible();
    await page.locator('#cmdk input').fill('waline');
    await expect(palette.locator('.cmdk-item').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(palette).toBeHidden();
  });
});

test.describe('posts', () => {
  test('a post shows its cover, table of contents and comment section', async ({ page }) => {
    await page.goto('/posts/waline/');
    await ready(page);
    await expect(page.locator('h1')).toContainText('waline');
    await expect(page.locator('.post-cover img')).toBeVisible();
    await expect(page.locator('.toc a').first()).toBeVisible();
    await expect(page.locator('[data-waline]')).toBeAttached();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('a post with a diagram renders it as SVG', async ({ page }) => {
    await page.goto('/posts/waline/');
    await ready(page);
    await expect(page.locator('pre.mermaid svg')).toBeVisible({ timeout: 20_000 });
  });

  test('gallery images open in the lightbox and Escape closes it', async ({ page }) => {
    await page.goto('/posts/Odawara/');
    await ready(page);
    const first = page.locator('.gallery figure').first();
    await first.scrollIntoViewIfNeeded();
    await first.click();
    await expect(page.locator('html')).toHaveClass(/lb-open/);
    await expect(page.locator('.lightbox')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('html')).not.toHaveClass(/lb-open/);
  });
});
