const root = document.documentElement;
const btn = () => document.getElementById('m-menu');
const isOpen = () => root.classList.contains('nav-open');

function setOpen(open: boolean, restoreFocus = true) {
  root.classList.toggle('nav-open', open);
  const b = btn();
  b?.setAttribute('aria-expanded', String(open));
  b?.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
  const content = document.querySelector('.content');
  if (content) (content as HTMLElement).inert = open;
  if (open) document.querySelector<HTMLElement>('.rail-nav a[aria-current="page"], .rail-nav a')?.focus();
  else if (restoreFocus) b?.focus({ preventScroll: true });
}

document.addEventListener('click', (e) => {
  const t = e.target as Element | null;
  if (!t?.closest) return;
  if (t.closest('#m-menu')) setOpen(!isOpen());
  else if (isOpen() && (t.closest('#m-scrim') || t.closest('.rail a[href]'))) setOpen(false, false);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isOpen()) setOpen(false);
});

window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => {
  if (e.matches && isOpen()) setOpen(false, false);
});

document.addEventListener('astro:after-swap', () => setOpen(false, false));
