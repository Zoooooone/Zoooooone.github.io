import { expect, mockPlayerMedia, navigate, ready, test } from './fixtures';

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

    // A click that lands before the image is laid out counts as a click outside it and closes the lightbox.
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.lb-img')].some((img) => img.getBoundingClientRect().width > 100),
    );

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
  test('skips songs awaiting audio and uses the newest available song if the default is absent', async ({ page }) => {
    await mockPlayerMedia(page);
    await page.route('**/playlist1.json', async (route) => {
      const response = await route.fetch();
      const tracks = (await response.json()).filter((track: { url: string }) => track.url !== 'space-walk.mp3');
      await route.fulfill({
        json: [{ name: 'Awaiting audio', artist: '', url: '', addedAt: '2026-10-14' }, ...tracks],
      });
    });
    await page.goto('/');
    await ready(page);
    await expect(page.locator('#player .pl-title')).toHaveText('Dear Boy (Avicii by Avicii)');
    await expect(page.locator('#player')).toHaveClass(/playing/);
    await page.locator('#player .pl-listbtn').click();
    await expect(page.locator('#pl-panel .pl-list button')).toHaveCount(9);
    await expect(page.locator('#pl-panel')).not.toContainText('Awaiting audio');
    await page.keyboard.press('Escape');
    await page.locator('#player .pl-next').click();
    await expect(page.locator('#player .pl-title')).toHaveText('势若风雷 Irresistible Force');
  });

  test('autoplay updates controls and stays playing across client-side navigation', async ({ page }) => {
    await mockPlayerMedia(page);
    await page.goto('/');
    await ready(page);
    await expect(page.locator('#player')).toHaveClass(/playing/);
    await expect(page.locator('#player .pl-play')).toHaveAttribute('aria-label', '暂停');
    await page.locator('#player audio').evaluate((audio) => {
      audio.dataset.marker = 'playing';
    });
    await navigate(page, '/about/');
    await expect(page.locator('#player audio')).toHaveAttribute('data-marker', 'playing');
    await expect(page.locator('#player')).toHaveClass(/playing/);
  });

  test('restores the paused song and progress after leaving, even if it was playing before reload', async ({
    page,
  }) => {
    await mockPlayerMedia(page);
    await page.goto('/');
    await ready(page);
    await expect(page.locator('#player')).toHaveClass(/playing/);
    await page.locator('#player .pl-next').click();
    await page.locator('#player audio').evaluate((audio: HTMLAudioElement) => {
      audio.currentTime = 42;
      audio.pause();
    });
    const title = await page.locator('#player .pl-title').textContent();
    await page.reload();
    await ready(page);
    await expect(page.locator('#player .pl-title')).toHaveText(title!);
    await expect(page.locator('#player')).not.toHaveClass(/playing/);
    expect(await page.locator('#player audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBe(42);
    await page.locator('#player .pl-play').click();
    await expect(page.locator('#player')).toHaveClass(/playing/);
    await page.reload();
    await ready(page);
    await expect(page.locator('#player')).not.toHaveClass(/playing/);
    expect(await page.locator('#player audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBe(42);
  });

  test('falls back to the default at zero when the saved song was removed', async ({ page }) => {
    await mockPlayerMedia(page);
    await page.addInitScript(() =>
      localStorage.setItem('player', JSON.stringify({ url: 'removed.mp3', i: 0, t: 100 })),
    );
    await page.goto('/');
    await ready(page);
    await expect(page.locator('#player .pl-title')).toHaveText('太空漫步 Space Walk');
    expect(await page.locator('#player audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBe(0);
    await expect(page.locator('#player')).not.toHaveClass(/playing/);
  });

  test('pinning a song preserves the remaining queue and keyboard focus', async ({ page }) => {
    await mockPlayerMedia(page);
    await page.goto('/');
    await ready(page);
    await page.locator('#player .pl-listbtn').click();
    const list = page.locator('#pl-panel .pl-list');
    const selected = list.locator('button[data-i="1"]');
    await selected.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#pl-panel')).toBeVisible();
    await expect(list.locator('button').first()).toHaveAttribute('data-i', '1');
    await expect(list.locator('button').first()).toBeFocused();
    const remaining = await list
      .locator('button')
      .evaluateAll((rows) => rows.slice(1).map((row) => Number((row as HTMLElement).dataset.i)));
    expect(remaining).toEqual([0, 2, 3, 4, 5, 6, 7, 8, 9]);
    await page.keyboard.press('Escape');
    await page.locator('#player .pl-next').click();
    await page.locator('#player .pl-listbtn').click();
    await expect(list.locator('button').first()).toHaveAttribute('data-i', '2');
  });

  test('tries autoplay without a saved song, handles a blocked attempt and does not autoplay on return', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const state = window as unknown as { __playAttempts: number };
      state.__playAttempts = 0;
      HTMLMediaElement.prototype.play = function () {
        state.__playAttempts++;
        return state.__playAttempts === 1
          ? Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'))
          : Promise.resolve();
      };
    });
    await page.goto('/');
    await ready(page);
    await expect(page.locator('#player .pl-title')).toHaveText('太空漫步 Space Walk');
    const attempts = () => page.evaluate(() => (window as unknown as { __playAttempts: number }).__playAttempts);
    await expect.poll(attempts).toBe(1);
    await expect(page.locator('#player')).not.toHaveClass(/playing/);
    await page.locator('#player .pl-play').click();
    await expect.poll(attempts).toBe(2);

    await page.reload();
    await ready(page);
    await expect(page.locator('#player .pl-title')).toHaveText('太空漫步 Space Walk');
    expect(await attempts()).toBe(0);
  });

  test('defaults to Space Walk and restores a saved song after the playlist is reordered', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await expect(page.locator('#player .pl-title')).toHaveText('太空漫步 Space Walk');

    await page.locator('#player .pl-next').click();
    const chosen = await page.locator('#player .pl-title').textContent();
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('player') ?? '{}'));
    expect(state.url).toBeTruthy();
    await page.route('**/playlist1.json', async (route) => {
      const response = await route.fetch();
      const list = await response.json();
      await route.fulfill({
        json: list
          .map((track: { url: string }) => ({
            ...track,
            addedAt: track.url === state.url ? '2026-10-14' : '2026-10-13',
          }))
          .reverse(),
      });
    });
    await page.reload();
    await ready(page);
    await expect(page.locator('#player .pl-title')).toHaveText(chosen!);
  });

  test('migrates the old saved playlist index before sorting by addition date', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('player', JSON.stringify({ i: 0, t: 12 })));
    await page.goto('/');
    await ready(page);
    await expect(page.locator('#player .pl-title')).toHaveText('Nuit Silencieuse');
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('player') ?? '{}'));
    expect(state.url).toBe('nuit-silencieuse.mp3');
  });
  test('a stored value that is not an object does not break the player', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('player', 'null'));
    await page.goto('/');
    await ready(page);
    await expect(page.locator('#player .pl-title')).not.toHaveText('—');
  });

  test('the lyrics of the current track are shown once they arrive', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        get: () => 2,
        set: () => {},
        configurable: true,
      });
    });
    await page.route('**/assets/audio/lrc/**', (route) =>
      route.fulfill({ contentType: 'text/plain', body: '[00:01.00]first line\n[00:05.00]second line' }),
    );
    await page.goto('/');
    await ready(page);
    await expect(page.locator('#player .pl-title')).not.toHaveText('—');

    await expect
      .poll(() =>
        page.evaluate(() => {
          document.querySelector('#player audio')!.dispatchEvent(new Event('timeupdate'));
          return document.querySelector('#player .pl-lyric')!.textContent;
        }),
      )
      .toBe('first line');
  });

  test('playback starts without waiting for the lyrics', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __plays: number };
      w.__plays = 0;
      HTMLMediaElement.prototype.play = function () {
        w.__plays++;
        return Promise.resolve();
      };
    });
    await page.route('**/assets/audio/lrc/**', (route) =>
      new Promise<void>((r) => setTimeout(r, 3000)).then(() => route.abort()),
    );
    await page.goto('/');
    await ready(page);
    await expect(page.locator('#player .pl-title')).not.toHaveText('—');

    const initialPlays = await page.evaluate(() => (window as unknown as { __plays: number }).__plays);
    await page.locator('#player .pl-next').click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __plays: number }).__plays), { timeout: 1500 })
      .toBeGreaterThan(initialPlays);
  });

  test('loads the playlist, switches tracks and remembers the choice', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const title = page.locator('#player .pl-title');
    await expect(title).not.toHaveText('—');
    const first = (await title.textContent())!;

    await page.locator('#player .pl-next').click();
    await expect(title).not.toHaveText(first);
    const second = (await title.textContent())!;

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('player') ?? '{}'));
    expect(saved.url).toBe('nuit-silencieuse.mp3');

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
    await expect(page.locator('#player .pl-title')).not.toHaveText('—');
    const panel = page.locator('#pl-panel');
    await expect(panel).toBeHidden();

    await page.locator('#player .pl-listbtn').click();
    await expect(panel).toBeVisible();
    const rows = panel.locator('.pl-list button');
    expect(await rows.count()).toBeGreaterThan(3);

    await panel.locator('button[data-i="2"]').click();
    await expect(panel.locator('.pl-list li.on button')).toHaveAttribute('data-i', '2');
    await expect(panel.locator('.pl-list li').first()).toHaveClass('on');
    await expect(panel.locator('.pl-list button').first()).toHaveAttribute('data-i', '2');
    expect((await page.evaluate(() => JSON.parse(localStorage.getItem('player') ?? '{}'))).i).toBe(2);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });
});

test.describe('command palette', () => {
  test('loads the search index again after a failed request', async ({ page }) => {
    let failing = true;
    await page.route('**/search.json', (route) =>
      failing ? route.fulfill({ status: 500, body: 'no' }) : route.continue(),
    );
    await page.goto('/about/');
    await ready(page);

    await page.keyboard.press('Control+K');
    await page.locator('#cmdk input').fill('waline');
    await expect(page.locator('#cmdk .cmdk-status')).toHaveText('索引加载失败');

    failing = false;
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+K');
    await page.locator('#cmdk input').fill('waline');
    await expect(page.locator('#cmdk .cmdk-status')).toHaveText(/RESULTS/);
    await expect(page.locator('#cmdk .cmdk-item').first()).toBeVisible();
  });

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
