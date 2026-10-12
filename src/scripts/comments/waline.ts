// Do not import the Waline stylesheet here: it is @imported in styles/index.css. Styles injected into <head>
// by a script are replaced on navigation, which leaves the comments unstyled.
import { pageviewCount } from '@waline/client/pageview';
import { onPage } from '@/scripts/core/lifecycle';

onPage(() => {
  const root = document.querySelector<HTMLElement>('[data-waline]');
  if (!root) return;

  const serverURL = root.dataset.server!;
  const path = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;

  const isBlogger = document.cookie.split('; ').some((c) => c.startsWith('blogger_visit='));
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

  const stopViews = pageviewCount({
    serverURL,
    path,
    update: !isBlogger && !isLocal,
    selector: '.waline-pageview-count',
  });

  let cancelled = false;
  let instance: { destroy: () => void } | undefined;

  const mount = async () => {
    const [{ init }, { default: katex }] = await Promise.all([import('@waline/client'), import('katex')]);
    if (cancelled) return;
    instance =
      init({
        el: '#waline',
        serverURL,
        path,
        lang: 'zh-CN',
        dark: 'html[data-theme="dark"]',
        comment: true,
        pageview: false,
        texRenderer: (blockMode: boolean, tex: string) =>
          katex.renderToString(tex, { displayMode: blockMode, throwOnError: false }),
      }) ?? undefined;
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      void mount();
    },
    { rootMargin: '800px 0px' },
  );
  observer.observe(root);

  return () => {
    cancelled = true;
    observer.disconnect();
    instance?.destroy();
    if (typeof stopViews === 'function') stopViews();
  };
});
