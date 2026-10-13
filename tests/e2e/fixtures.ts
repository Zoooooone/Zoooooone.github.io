import { expect, test as base, type Page } from '@playwright/test';

type Fixtures = { errors: string[] };

const WALINE_HOST = 'waline-beige-eight.vercel.app';

export const test = base.extend<Fixtures>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text());
      });
      await page.route(
        (url) => !['127.0.0.1', 'localhost'].includes(url.hostname),
        (route) => {
          if (new URL(route.request().url()).hostname === WALINE_HOST) {
            return route.fulfill({
              json: { errno: 0, errmsg: '', data: Array.from({ length: 10 }, () => ({ time: 0 })) },
              headers: { 'access-control-allow-origin': '*' },
            });
          }
          return route.abort();
        },
      );
      await use(errors);
      expect(errors, 'unexpected script errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function mockPlayerMedia(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperties(HTMLMediaElement.prototype, {
      paused: {
        get() {
          return this.dataset.mockPlaying !== 'true';
        },
        configurable: true,
      },
      currentTime: {
        get() {
          return Number(this.dataset.mockTime ?? 0);
        },
        set(time: number) {
          this.dataset.mockTime = String(time);
        },
        configurable: true,
      },
      duration: { get: () => 600, configurable: true },
    });
    HTMLMediaElement.prototype.play = function () {
      this.dataset.mockPlaying = 'true';
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      this.dataset.mockPlaying = 'false';
      this.dispatchEvent(new Event('pause'));
    };
  });
}

export async function ready(page: Page) {
  await page.waitForLoadState('load');
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

export async function navigate(page: Page, path: string) {
  await page.locator(`.rail a[href="${path}"]`).first().click();
  await page.waitForURL((u) => u.pathname === path);
  await ready(page);
}

export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
