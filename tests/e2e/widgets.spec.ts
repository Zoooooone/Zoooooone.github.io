import { expect, ready, test } from './fixtures';

test.describe('lightbox', () => {
  test('zooms with the keyboard and the wheel, and pages with the arrow keys', async ({ page }) => {
    await page.goto('/posts/Odawara/');
    await ready(page);
    const first = page.locator('.gallery figure').first();
    await first.scrollIntoViewIfNeeded();
    await first.click();
    await expect(page.locator('.lightbox')).toBeVisible();

    const level = page.locator('.lb-level');
    const counter = page.locator('.lightbox .cap .counter');
    await expect(level).toHaveText('100%');
    await expect(counter).toHaveText(/^01 \/ \d+$/);

    await page.keyboard.press('+');
    await expect(level).not.toHaveText('100%');
    await page.keyboard.press('0');
    await expect(level).toHaveText('100%');

    const stage = page.locator('.lb-stage');
    const box = (await stage.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -400);
    await expect(level).not.toHaveText('100%');
    await page.locator('.lb-reset').click();
    await expect(level).toHaveText('100%');

    await page.keyboard.press('ArrowRight');
    await expect(counter).toHaveText(/^02 \/ \d+$/);
    await page.keyboard.press('ArrowLeft');
    await expect(counter).toHaveText(/^01 \/ \d+$/);

    await page.locator('.lb-close').click();
    await expect(page.locator('html')).not.toHaveClass(/lb-open/);
  });
  test('click zooms in and out, and a horizontal drag pages', async ({ page }) => {
    await page.goto('/posts/Odawara/');
    await ready(page);
    const first = page.locator('.gallery figure').first();
    await first.scrollIntoViewIfNeeded();
    await first.click();
    await expect(page.locator('.lightbox')).toBeVisible();

    const level = page.locator('.lb-level');
    const counter = page.locator('.lightbox .cap .counter');
    const stage = (await page.locator('.lb-stage').boundingBox())!;
    const cx = stage.x + stage.width / 2;
    const cy = stage.y + stage.height / 2;

    await page.mouse.click(cx, cy);
    await expect(level).toHaveText('250%');
    await page.mouse.click(cx, cy);
    await expect(level).toHaveText('100%');

    await page.mouse.move(cx + 220, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 220, cy, { steps: 8 });
    await page.mouse.up();
    await expect(counter).toHaveText(/^02 \/ \d+$/);
  });
});

test.describe('music player', () => {
  test('loads the playlist, switches tracks and remembers the choice', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const title = page.locator('#player .pl-title');
    await expect(title).not.toHaveText('');
    const first = (await title.textContent())!;

    await page.locator('#player .pl-next').click();
    await expect(title).not.toHaveText(first);
    const second = (await title.textContent())!;

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('player') ?? '{}'));
    expect(saved.i).toBe(1);

    await page.reload();
    await ready(page);
    await expect(title).toHaveText(second);
  });

  test('cycles the play mode and keeps it', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const mode = page.locator('#player .pl-mode');
    await expect(mode).toHaveAttribute('data-mode', 'list');
    await mode.click();
    await expect(mode).toHaveAttribute('data-mode', 'shuffle');
    await mode.click();
    await expect(mode).toHaveAttribute('data-mode', 'single');
    await mode.click();
    await expect(mode).toHaveAttribute('data-mode', 'list');

    await mode.click();
    await page.reload();
    await ready(page);
    await expect(page.locator('#player .pl-mode')).toHaveAttribute('data-mode', 'shuffle');
  });

  test('the playlist panel lists every track, picks one and closes with Escape', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const panel = page.locator('#pl-panel');
    await expect(panel).toBeHidden();

    await page.locator('#player .pl-listbtn').click();
    await expect(panel).toBeVisible();
    const rows = panel.locator('.pl-list button');
    expect(await rows.count()).toBeGreaterThan(3);

    await rows.nth(2).click();
    await expect(panel.locator('.pl-list li.on button')).toHaveAttribute('data-i', '2');
    expect((await page.evaluate(() => JSON.parse(localStorage.getItem('player') ?? '{}'))).i).toBe(2);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });
});

test.describe('command palette', () => {
  test('lists the latest posts before typing and navigates with the keyboard', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await page.keyboard.press('Control+K');
    const palette = page.locator('#cmdk');
    await expect(palette.locator('.cmdk-group').first()).toContainText('LATEST');
    await expect(palette.locator('.cmdk-item').first()).toBeVisible();

    await page.locator('#cmdk input').fill('archives');
    await expect(palette.locator('.cmdk-item').first()).toContainText('Archives');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await page.waitForURL((u) => u.pathname === '/archives/');
    await expect(palette).toBeHidden();
  });

  test('opens with the slash key outside of text fields', async ({ page }) => {
    await page.goto('/about/');
    await ready(page);
    await page.keyboard.press('/');
    await expect(page.locator('#cmdk')).toBeVisible();
  });
});
