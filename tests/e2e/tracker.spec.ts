import type { Page } from '@playwright/test';
import { analytics } from '../../src/config/site';
import { expect, navigate, ready, test } from './fixtures';

// The tracker stays silent on localhost, so the pages are served under a made-up host and every request
// for it is answered from the local preview. Reports to the Worker are caught instead of sent.
const SITE = 'https://blog.test';
const WORKER_HOST = new URL(analytics.endpoint).hostname;

interface Report {
  type: 'hit' | 'leave';
  pv: string;
  [key: string]: unknown;
}

async function track(page: Page) {
  const local = test.info().project.use.baseURL!;
  await page.route(`${SITE}/**`, async (route) => {
    try {
      const response = await route.fetch({ url: route.request().url().replace(SITE, local) });
      await route.fulfill({ response });
    } catch {
      // The page prefetches the search index, so a request can still be in flight when the test ends.
    }
  });

  const reports: Report[] = [];
  await page.route(
    (url) => url.hostname === WORKER_HOST,
    async (route) => {
      reports.push(JSON.parse(route.request().postData() ?? '{}'));
      await route.fulfill({ status: 204 });
    },
  );
  return {
    hits: () => reports.filter((r) => r.type === 'hit'),
    leaves: () => reports.filter((r) => r.type === 'leave'),
  };
}

test.describe('tracker', () => {
  test('sends what it can see with the page view, and only the campaign tags from the address', async ({ page }) => {
    const sent = await track(page);
    await page.goto(`${SITE}/posts/Odawara/?utm_source=chatgpt.com&utm_medium=referral&token=secret`);
    await ready(page);
    await expect.poll(() => sent.hits().length).toBe(1);

    const [hit] = sent.hits();
    expect(hit).toMatchObject({
      path: '/posts/Odawara/',
      viewport: '1280x800',
      nav: 'navigate',
      utm_source: 'chatgpt.com',
      utm_medium: 'referral',
      utm_campaign: '',
      touch: expect.any(Number),
      // Playwright drives Chrome, which sets navigator.webdriver, so this is also a check that the flag is read.
      automation: true,
    });
    expect(hit.dpr).toMatch(/^\d+(\.\d+)?$/);
    expect(JSON.stringify(hit)).not.toContain('secret');
  });

  test('reports interaction and how far down the page the visitor got when leaving', async ({ page }) => {
    const sent = await track(page);
    await page.goto(`${SITE}/archives/`);
    await ready(page);
    await expect.poll(() => sent.hits().length).toBe(1);

    // The scroll is smooth, so keep pressing End until the window is at the bottom. A page without a comment
    // box is used: reaching the bottom of a post loads Waline, which the fixtures only mock for the view count.
    await expect
      .poll(
        async () => {
          await page.keyboard.press('End');
          return page.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 2);
        },
        { timeout: 15_000 },
      )
      .toBe(true);
    await navigate(page, '/about/');

    await expect.poll(() => sent.leaves().length).toBeGreaterThan(0);
    const leave = sent.leaves()[0];
    expect(leave.pv).toBe(sent.hits()[0].pv);
    expect(leave.interacted).toBe(true);
    expect(leave.scroll).toBeGreaterThanOrEqual(90);
    expect(leave.ms).toBeGreaterThan(0);
  });

  test('calls the next page an in-site swap and remembers where it came from', async ({ page }) => {
    const sent = await track(page);
    await page.goto(`${SITE}/posts/Odawara/`);
    await ready(page);
    await expect.poll(() => sent.hits().length).toBe(1);
    await navigate(page, '/about/');
    await expect.poll(() => sent.hits().length).toBe(2);

    expect(sent.hits()[1]).toMatchObject({ path: '/about/', nav: 'spa', referrer: '/posts/Odawara/', utm_source: '' });
  });

  test('does not count events a script made up as interaction', async ({ page }) => {
    const sent = await track(page);
    await page.goto(`${SITE}/posts/Odawara/`);
    await ready(page);
    await expect.poll(() => sent.hits().length).toBe(1);

    await page.evaluate(() => {
      for (const type of ['pointerdown', 'keydown', 'touchstart', 'wheel']) window.dispatchEvent(new Event(type));
      window.dispatchEvent(new Event('pagehide'));
    });

    await expect.poll(() => sent.leaves().length).toBeGreaterThan(0);
    expect(sent.leaves()[0].interacted).toBe(false);
    // The long gallery page was never scrolled, so only the part in the first window counts.
    expect(sent.leaves()[0].scroll).toBeLessThan(50);
  });
});
