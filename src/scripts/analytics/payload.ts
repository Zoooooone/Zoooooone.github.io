export interface PageView {
  /** Random id of this page view, used to attach the time on page afterwards. */
  pv: string;
  visitor: string;
  path: string;
  referrer: string;
  screen: string;
  lang: string;
  tz: string;
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
  cookie: string;
  doNotTrack: string | null | undefined;
}): boolean {
  if (!env.endpoint) return false;
  if (['localhost', '127.0.0.1', '[::1]'].includes(env.hostname)) return false;
  if (env.doNotTrack === '1') return false;
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
