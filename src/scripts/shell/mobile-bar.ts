import { nextBarState } from './bar-visibility';

const root = document.documentElement;
const narrow = window.matchMedia('(max-width: 860px)');

const panelOpen = () => !document.getElementById('pl-panel')?.hidden;
const hasFocus = () => {
  const active = document.activeElement;
  return !!active?.closest('.topbar, #m-menu') && active.matches(':focus-visible');
};
const sheetOpen = () => root.hasAttribute('data-player-sheet');

let lastY = window.scrollY;
let hidden = false;
let frame = 0;

function setHidden(value: boolean) {
  hidden = value;
  root.toggleAttribute('data-bar-hidden', value);
}

function update() {
  frame = 0;
  const pinned = !narrow.matches || root.classList.contains('nav-open') || sheetOpen() || panelOpen() || hasFocus();
  const next = nextBarState({
    y: window.scrollY,
    lastY,
    viewport: window.innerHeight,
    scrollHeight: root.scrollHeight,
    hidden,
    pinned,
  });
  lastY = next.lastY;
  if (next.hidden !== hidden) setHidden(next.hidden);
}

const schedule = () => {
  if (!frame) frame = requestAnimationFrame(update);
};

function setSheet(open: boolean) {
  root.toggleAttribute('data-player-sheet', open);
  const btn = document.querySelector('.pl-expand');
  btn?.setAttribute('aria-expanded', String(open));
  btn?.setAttribute('aria-label', open ? '收起播放器' : '展开播放器');
  schedule();
}

window.addEventListener('scroll', schedule, { passive: true });
document.addEventListener('focusin', schedule);
document.addEventListener('focusout', schedule);

document.addEventListener('click', (e) => {
  const t = e.target as Element | null;
  if (!t?.closest || !narrow.matches) return;
  const started = document.getElementById('player')?.dataset.started === '1';
  if (t.closest('.pl-expand') || (started && t.closest('.topbar .pl-cover, .topbar .pl-meta'))) {
    setSheet(!sheetOpen());
  } else if (sheetOpen() && !t.closest('.topbar, #pl-panel')) {
    setSheet(false);
  } else {
    schedule();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheetOpen() && !panelOpen()) setSheet(false);
});

narrow.addEventListener('change', () => {
  setSheet(false);
  setHidden(false);
});

document.addEventListener('astro:after-swap', () => {
  setSheet(false);
  setHidden(false);
  lastY = window.scrollY;
});
