import { describe, expect, it } from 'vitest';
import {
  createStopwatch,
  looksAutomated,
  navTypeOf,
  referrerOf,
  scrollDepth,
  shouldTrack,
  utmOf,
} from '@/scripts/analytics/payload';

describe('referrerOf', () => {
  it('prefers the page navigated from inside the site', () => {
    expect(referrerOf('https://google.com/', 'https://a.io', '/posts/x/')).toBe('/posts/x/');
  });

  it('keeps the origin of an outside referrer and drops the query', () => {
    expect(referrerOf('https://google.com/search?q=secret', 'https://a.io', null)).toBe('https://google.com/search');
  });

  it('reduces a same-site referrer to its path', () => {
    expect(referrerOf('https://a.io/about/', 'https://a.io', null)).toBe('/about/');
  });

  it('is empty for no or a malformed referrer', () => {
    expect(referrerOf('', 'https://a.io', null)).toBe('');
    expect(referrerOf('not a url', 'https://a.io', null)).toBe('');
  });
});

describe('shouldTrack', () => {
  const base = { endpoint: 'https://w.dev/e', hostname: 'a.io', pathname: '/posts/x/', cookie: '', doNotTrack: null };

  it('tracks an ordinary visit', () => {
    expect(shouldTrack(base)).toBe(true);
  });

  it.each([
    ['no endpoint', { endpoint: '' }],
    ['local development', { hostname: 'localhost' }],
    ['Do Not Track', { doNotTrack: '1' }],
    ['the stats page itself', { pathname: '/stats/' }],
    ['the blogger cookie', { cookie: 'x=1; blogger_visit=true' }],
  ])('skips %s', (_name, override) => {
    expect(shouldTrack({ ...base, ...override })).toBe(false);
  });
});

describe('createStopwatch', () => {
  it('counts only the time between start and pause', () => {
    let t = 0;
    const watch = createStopwatch(() => t);
    watch.start();
    t = 1000;
    watch.pause();
    t = 5000;
    watch.start();
    t = 5500;
    expect(watch.elapsed()).toBe(1500);
  });

  it('ignores a second start while running', () => {
    let t = 0;
    const watch = createStopwatch(() => t);
    watch.start();
    t = 100;
    watch.start();
    t = 300;
    expect(watch.elapsed()).toBe(300);
  });
});

describe('navTypeOf', () => {
  it('reports how the first page was opened', () => {
    expect(navTypeOf('reload', true)).toBe('reload');
    expect(navTypeOf('back_forward', true)).toBe('back_forward');
    expect(navTypeOf('prerender', true)).toBe('prerender');
  });

  it('falls back to navigate for anything else', () => {
    expect(navTypeOf(undefined, true)).toBe('navigate');
    expect(navTypeOf('weird', true)).toBe('navigate');
  });

  it('calls every later page an in-site swap, whatever the browser says', () => {
    expect(navTypeOf('navigate', false)).toBe('spa');
    expect(navTypeOf(undefined, false)).toBe('spa');
  });
});

describe('utmOf', () => {
  it('reads the three campaign tags', () => {
    expect(utmOf('?utm_source=chatgpt.com&utm_medium=referral&utm_campaign=spring-2026')).toEqual({
      utm_source: 'chatgpt.com',
      utm_medium: 'referral',
      utm_campaign: 'spring-2026',
    });
  });

  it('ignores everything else in the query string', () => {
    const result = utmOf('?token=secret&email=a@b.c&utm_source=x');
    expect(result).toEqual({ utm_source: 'x', utm_medium: '', utm_campaign: '' });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('drops values that are too long or have odd characters', () => {
    expect(utmOf(`?utm_source=${'a'.repeat(65)}&utm_medium=<b>`)).toEqual({
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
    });
  });

  it('is empty without a query', () => {
    expect(utmOf('')).toEqual({ utm_source: '', utm_medium: '', utm_campaign: '' });
  });
});

describe('scrollDepth', () => {
  it('counts a page that fits the window as fully seen', () => {
    expect(scrollDepth(0, 800, 800)).toBe(100);
    expect(scrollDepth(0, 800, 500)).toBe(100);
  });

  it('measures the bottom edge of the window against the page', () => {
    expect(scrollDepth(0, 800, 4000)).toBe(20);
    expect(scrollDepth(1600, 800, 4000)).toBe(60);
    expect(scrollDepth(3200, 800, 4000)).toBe(100);
  });

  it('stays between 0 and 100', () => {
    expect(scrollDepth(-50, 800, 4000)).toBe(19);
    expect(scrollDepth(9999, 800, 4000)).toBe(100);
  });
});

describe('looksAutomated', () => {
  const human = { webdriver: false, userAgent: 'Mozilla/5.0 Chrome/120', languages: ['en-US'] };

  it('is false for an ordinary browser', () => {
    expect(looksAutomated(human)).toBe(false);
    expect(looksAutomated({ ...human, webdriver: undefined })).toBe(false);
  });

  it.each([
    ['the webdriver flag', { webdriver: true }],
    ['a headless browser identifier', { userAgent: 'Mozilla/5.0 HeadlessChrome/120' }],
    ['no languages at all', { languages: [] }],
  ])('is true for %s', (_name, override) => {
    expect(looksAutomated({ ...human, ...override })).toBe(true);
  });
});
