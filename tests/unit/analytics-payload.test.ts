import { describe, expect, it } from 'vitest';
import { createStopwatch, referrerOf, shouldTrack } from '@/scripts/analytics/payload';

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
  const base = { endpoint: 'https://w.dev/e', hostname: 'a.io', cookie: '', doNotTrack: null };

  it('tracks an ordinary visit', () => {
    expect(shouldTrack(base)).toBe(true);
  });

  it.each([
    ['no endpoint', { endpoint: '' }],
    ['local development', { hostname: 'localhost' }],
    ['Do Not Track', { doNotTrack: '1' }],
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
