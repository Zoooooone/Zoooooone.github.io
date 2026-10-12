// The site uses Astro's ClientRouter (navigation without full reloads), and module scripts run only once.
// Page scripts therefore register with onPage: `init` runs on every page entry and its returned
// cleanup runs before the page is swapped out.

declare global {
  interface Window {
    __pageLoaded?: boolean;
  }
}

export type Cleanup = () => void;

if (!window.__pageLoaded) {
  document.addEventListener('astro:page-load', () => {
    window.__pageLoaded = true;
  });
}

export function onPage(init: () => void | Cleanup) {
  let cleanup: void | Cleanup;

  const run = () => {
    if (typeof cleanup === 'function') cleanup();
    cleanup = init();
  };

  document.addEventListener('astro:page-load', run);
  document.addEventListener('astro:before-swap', () => {
    if (typeof cleanup === 'function') cleanup();
    cleanup = undefined;
  });

  // A script first loaded after navigation may have missed page-load; run is idempotent, so a late event is harmless.
  if (window.__pageLoaded) run();
}
