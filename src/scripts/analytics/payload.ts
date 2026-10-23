export interface PageView {
  /** Random id of this page view, used to attach the time on page afterwards. */
  pv: string;
  visitor: string;
  path: string;
  referrer: string;
  screen: string;
  lang: string;
  tz: string;
  viewport: string;
  dpr: string;
  touch: number;
  nav: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  automation: boolean;
}

const NAVIGATION_TYPES = ['navigate', 'reload', 'back_forward', 'prerender'];
const CAMPAIGN_VALUE = /^[\w.-]{1,64}$/;

/** How the page was opened. After the first page the site swaps pages without a load, which the browser does not report. */
export function navTypeOf(entryType: string | undefined, firstPage: boolean): string {
  if (!firstPage) return 'spa';
  return entryType !== undefined && NAVIGATION_TYPES.includes(entryType) ? entryType : 'navigate';
}

export function utmOf(search: string): Pick<PageView, 'utm_source' | 'utm_medium' | 'utm_campaign'> {
  const params = new URLSearchParams(search);
  const read = (key: string) => {
    const value = params.get(key) ?? '';
    return CAMPAIGN_VALUE.test(value) ? value : '';
  };
  return { utm_source: read('utm_source'), utm_medium: read('utm_medium'), utm_campaign: read('utm_campaign') };
}

/** A page that fits the window counts as fully seen. */
export function scrollDepth(scrollTop: number, windowHeight: number, pageHeight: number): number {
  if (pageHeight <= windowHeight) return 100;
  return Math.min(100, Math.max(0, Math.round(((scrollTop + windowHeight) / pageHeight) * 100)));
}

// A hint, not a verdict: a crawler that hides these gets through.
export function looksAutomated(browser: {
  webdriver: boolean | undefined;
  userAgent: string;
  languages: readonly string[] | undefined;
}): boolean {
  return (
    browser.webdriver === true ||
    /HeadlessChrome/i.test(browser.userAgent) ||
    (browser.languages !== undefined && browser.languages.length === 0)
  );
}

export function referrerOf(raw: string, ownOrigin: string, previousPath: string | null): string {
  if (previousPath) return previousPath;
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.origin === ownOrigin ? url.pathname : `${url.origin}${url.pathname}`;
  } catch {
    return '';
  }
}

export function shouldTrack(env: {
  endpoint: string;
  hostname: string;
  pathname: string;
  cookie: string;
  doNotTrack: string | null | undefined;
}): boolean {
  if (!env.endpoint) return false;
  if (['localhost', '127.0.0.1', '[::1]'].includes(env.hostname)) return false;
  if (env.doNotTrack === '1') return false;
  if (env.pathname.startsWith('/stats/')) return false;
  return !env.cookie.split('; ').some((c) => c.startsWith('blogger_visit='));
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export function createStopwatch(now: () => number = () => performance.now()) {
  let total = 0;
  let since: number | null = null;
  return {
    start() {
      since ??= now();
    },
    pause() {
      if (since !== null) total += now() - since;
      since = null;
    },
    elapsed() {
      return Math.round(total + (since === null ? 0 : now() - since));
    },
  };
}
