import { analytics } from '@/config/site';
import { onPage } from '@/scripts/core/lifecycle';
import {
  createStopwatch,
  looksAutomated,
  navTypeOf,
  newId,
  referrerOf,
  scrollDepth,
  shouldTrack,
  utmOf,
  type PageView,
} from './payload';

const VISITOR_KEY = 'visitor-id';

function visitorId(): string {
  try {
    const stored = localStorage.getItem(VISITOR_KEY);
    if (stored) return stored;
    const id = newId();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    // Storage blocked: every page view then counts as a new visitor, which is the honest fallback.
    return newId();
  }
}

// text/plain keeps the request "simple" for CORS, so no preflight round trip delays or drops the beacon.
function send(body: object) {
  const data = JSON.stringify(body);
  if (navigator.sendBeacon?.(analytics.endpoint, new Blob([data], { type: 'text/plain' }))) return;
  void fetch(analytics.endpoint, { method: 'POST', body: data, keepalive: true, mode: 'no-cors' }).catch(() => {});
}

let previousPath: string | null = null;

onPage(() => {
  if (
    !shouldTrack({
      endpoint: analytics.endpoint,
      hostname: location.hostname,
      pathname: location.pathname,
      cookie: document.cookie,
      doNotTrack: navigator.doNotTrack,
    })
  )
    return;

  const firstPage = previousPath === null;
  const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const view: PageView = {
    pv: newId(),
    visitor: visitorId(),
    path: location.pathname,
    referrer: referrerOf(document.referrer, location.origin, previousPath),
    screen: `${screen.width}x${screen.height}`,
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewport: `${innerWidth}x${innerHeight}`,
    dpr: String(Math.round(devicePixelRatio * 100) / 100),
    touch: navigator.maxTouchPoints,
    nav: navTypeOf(entry?.type, firstPage),
    ...utmOf(location.search),
    automation: looksAutomated({
      webdriver: navigator.webdriver,
      userAgent: navigator.userAgent,
      languages: navigator.languages,
    }),
  };
  previousPath = location.pathname;
  send({ type: 'hit', ...view });

  const watch = createStopwatch();
  if (document.visibilityState === 'visible') watch.start();

  // Only events the browser itself raised count: a script that dispatches clicks produces untrusted ones.
  let interacted = false;
  const onInteract = (event: Event) => {
    if (event.isTrusted) interacted = true;
  };
  const interactions = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
  for (const type of interactions) addEventListener(type, onInteract, { passive: true });

  let deepest = 0;
  const measure = () => {
    deepest = Math.max(deepest, scrollDepth(scrollY, innerHeight, document.documentElement.scrollHeight));
  };
  measure();
  let frame = 0;
  const onScroll = () => {
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      measure();
    });
  };
  addEventListener('scroll', onScroll, { passive: true });

  const report = () => {
    measure();
    send({ type: 'leave', pv: view.pv, visitor: view.visitor, ms: watch.elapsed(), interacted, scroll: deepest });
  };
  // Phones often kill the page without firing pagehide, so the time is reported whenever the page is hidden.
  // The server keeps the largest value, so reporting again after the visitor returns is safe.
  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      watch.start();
    } else {
      watch.pause();
      report();
    }
  };
  const onPageHide = () => {
    watch.pause();
    report();
  };
  document.addEventListener('visibilitychange', onVisibility);
  addEventListener('pagehide', onPageHide);

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    removeEventListener('pagehide', onPageHide);
    watch.pause();
    report();
    for (const type of interactions) removeEventListener(type, onInteract);
    removeEventListener('scroll', onScroll);
    cancelAnimationFrame(frame);
  };
});
