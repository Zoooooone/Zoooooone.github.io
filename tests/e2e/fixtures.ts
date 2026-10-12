import { expect, test as base, type Page } from '@playwright/test';

type Fixtures = { errors: string[] };

const WALINE_HOST = 'waline-beige-eight.vercel.app';

/**
 * Every test runs against the built site with all third-party hosts blocked (Waline server, audio CDN, ...), so
 * results do not depend on the network. Uncaught script errors fail the test that caused them.
 */
export const test = base.extend<Fixtures>({
  // `auto` makes it apply to every test, not only the ones that ask for it.
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
          // The Waline server answers with an empty result; every other third-party host is unreachable.
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

/** Waits until the page has finished (re)initializing after a full load or a client-side navigation. */
export async function ready(page: Page) {
  await page.waitForLoadState('load');
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Clicks a link inside the app shell and waits for the client-side navigation to land. */
export async function navigate(page: Page, path: string) {
  await page.locator(`.rail a[href="${path}"]`).first().click();
  await page.waitForURL((u) => u.pathname === path);
  await ready(page);
}

export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
