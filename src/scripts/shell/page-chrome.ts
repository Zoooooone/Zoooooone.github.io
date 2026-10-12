import { onPage } from '@/scripts/core/lifecycle';

const isActive = (href: string, path: string) =>
  href === '/' ? path === '/' || path.startsWith('/posts/') : path.startsWith(href);

/**
 * The rail and topbar entrance animation plays once, on full page load.
 * They are kept by transition:persist, and the router re-inserts both nodes into the new document; browsers restart CSS
 * animations on re-inserted elements, so the animation class is removed once it has played.
 */
function playShellIntroOnce() {
  document.querySelectorAll<HTMLElement>('.rail.wipe, .topbar.wipe').forEach((el) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.classList.remove('wipe');
      el.style.removeProperty('--i');
    };
    el.addEventListener('animationend', (e) => {
      if (e.target === el) finish();
    });
    window.setTimeout(finish, 2000);
  });
}
playShellIntroOnce();

function setupRuler() {
  const mark = document.querySelector<HTMLElement>('#ruler .ruler-mark');
  const label = mark?.querySelector('b');
  if (!mark || !label) return () => {};

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    mark.style.setProperty('--p', String(p));
    label.textContent = `${Math.round(p * 100)}%`;
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
  return update;
}
const updateRuler = setupRuler();

onPage(() => {
  const path = location.pathname;
  document.querySelectorAll<HTMLAnchorElement>('.rail-nav a').forEach((a) => {
    const href = new URL(a.href).pathname;
    if (isActive(href, path)) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  const bar = document.getElementById('progress');
  if (bar) bar.style.transform = 'scaleX(0)';

  updateRuler();
  const t = window.setTimeout(updateRuler, 600);
  return () => window.clearTimeout(t);
});
