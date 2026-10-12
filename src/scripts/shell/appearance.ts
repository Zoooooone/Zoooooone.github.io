import type { Wallpaper } from '@/lib/theme/wallpapers';

declare global {
  interface Window {
    __applyWallpaperTheme: (index: number) => void;
  }
}

const root = document.documentElement;
const wallpapers: Wallpaper[] = JSON.parse(document.getElementById('wallpapers-data')!.textContent!);

const remember = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

document.getElementById('theme-toggle')!.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  remember('theme', next);
});

const layers = [document.querySelector<HTMLElement>('.bg-a')!, document.querySelector<HTMLElement>('.bg-b')!];
const nameEl = document.getElementById('bg-name')!;
const indexEl = document.getElementById('bg-index')!;
const two = (n: number) => String(n).padStart(2, '0');

const describe = (i: number) => {
  const w = wallpapers[i];
  nameEl.textContent = w.name;
  indexEl.textContent = `${two(i + 1)} / ${two(wallpapers.length)}`;
  nameEl.title = [w.en ? `${w.name} · ${w.en}` : w.name, w.subject, w.credit].filter(Boolean).join('\n');
};

const paintLayer = (layer: HTMLElement, w: Wallpaper) => {
  layer.style.backgroundImage = w.src ? `url("${w.src}")` : 'none';
  layer.style.backgroundPosition = w.position || 'center';
};

let current = parseInt(root.dataset.bg || '0', 10);
let front = 0;

const show = (i: number) => {
  const w = wallpapers[i];
  const next = layers[1 - front];
  paintLayer(next, w);
  next.classList.add('on');
  layers[front].classList.remove('on');
  front = 1 - front;
  if (w.src) root.removeAttribute('data-plain');
  else root.setAttribute('data-plain', '');
  window.__applyWallpaperTheme(i);
  describe(i);
  remember('bg', String(i));
};

paintLayer(layers[0], wallpapers[current]);
layers[0].classList.add('on');
describe(current);
document.getElementById('bg-toggle')!.addEventListener('click', () => {
  current = (current + 1) % wallpapers.length;
  show(current);
});

const fxButton = document.getElementById('fx-toggle')!;
const paintFx = () => fxButton.setAttribute('aria-pressed', String(root.dataset.fx !== 'off'));
paintFx();
fxButton.addEventListener('click', () => {
  const next = root.dataset.fx === 'off' ? 'on' : 'off';
  root.dataset.fx = next;
  remember('fx', next);
  paintFx();
});
