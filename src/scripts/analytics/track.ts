import { analytics } from '@/config/site';
import { onPage } from '@/scripts/core/lifecycle';
import { createStopwatch, newId, referrerOf, shouldTrack, type PageView } from './payload';

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
      cookie: document.cookie,
      doNotTrack: navigator.doNotTrack,
    })
  )
    return;

  const view: PageView = {
    pv: newId(),
    visitor: visitorId(),
    path: location.pathname,
    referrer: referrerOf(document.referrer, location.origin, previousPath),
    screen: `${screen.width}x${screen.height}`,
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  previousPath = location.pathname;
  send({ type: 'hit', ...view });

  const watch = createStopwatch();
  if (document.visibilityState === 'visible') watch.start();

  const report = () => send({ type: 'leave', pv: view.pv, visitor: view.visitor, ms: watch.elapsed() });
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
  };
});
