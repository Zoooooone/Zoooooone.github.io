import { expect, horizontalOverflow, mockPlayerMedia, navigate, ready, test } from './fixtures';

test('language choice survives navigation and reload, and both playlists select the right songs', async ({ page }) => {
  await mockPlayerMedia(page);
  await page.goto('/about/');
  await ready(page);
  await expect(page.locator('#player .pl-title')).toHaveText('太空漫步 Space Walk');
  for (const lang of ['zh', 'en']) {
    await page.locator(`[data-lang="${lang}"]`).click();
    const panel = page.locator(`[data-panel="${lang}"]`);
    await expect(panel).toBeVisible();
    await expect(page.locator(`[data-panel="${lang === 'zh' ? 'en' : 'zh'}"]`)).toBeHidden();
    const buttons = panel.locator('.tracklist button');
    for (const index of [0, 3, 9]) {
      const button = buttons.nth(index);
      await button.click();
      await expect(page.locator('#player .pl-title')).toHaveText((await button.locator('.nm').textContent())!);
    }
  }
  await navigate(page, '/archives/');
  await navigate(page, '/about/');
  await expect(page.locator('[data-panel="en"]')).toBeVisible();
  await page.locator('[data-lang="zh"]').click();
  await page.reload();
  await ready(page);
  await expect(page.locator('[data-panel="zh"]')).toBeVisible();
});

test('gallery and background disclosures work with the keyboard on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about/');
  await ready(page);
  for (const lang of ['zh', 'en']) {
    await page.locator(`[data-lang="${lang}"]`).click();
    const panel = page.locator(`[data-panel="${lang}"]`);
    for (const details of await panel.locator('details').all()) {
      const summary = details.locator('summary');
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(details).toHaveAttribute('open', '');
    }
    const first = panel.locator('.gallery figure').first();
    await expect(first).toBeVisible();
    await first.scrollIntoViewIfNeeded();
    await expect
      .poll(() => first.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
    await first.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.lightbox')).toBeVisible();
    await page.keyboard.press('Escape');
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  }
});

test('both languages embed the same four videos with accessible titles and responsive dimensions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about/');
  await ready(page);
  let sources: string[] = [];
  for (const lang of ['zh', 'en']) {
    await page.locator(`[data-lang="${lang}"]`).click();
    const frames = page.locator(`[data-panel="${lang}"] iframe`);
    await expect(frames).toHaveCount(4);
    const urls = await frames.evaluateAll((elements) => elements.map((frame) => (frame as HTMLIFrameElement).src));
    if (sources.length) expect(urls).toEqual(sources);
    sources = urls;
    for (const frame of await frames.all()) {
      await expect(frame).toHaveAttribute('title', /.+/);
      const box = (await frame.boundingBox())!;
      expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
    }
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  }
});
