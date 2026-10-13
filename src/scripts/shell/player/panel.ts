import type { Track } from './playlist';

type Options = {
  player: HTMLElement;
  panel: HTMLElement;
  button: HTMLButtonElement;
  coverOf: (src?: string) => string;
  onPick: (index: number) => void;
};

export function createPanel({ player, panel, button, coverOf, onPick }: Options) {
  const listEl = panel.querySelector<HTMLOListElement>('.pl-list')!;

  const place = () => {
    const bar = player.closest('.topbar');
    if (!bar) return;
    if (window.matchMedia('(max-width: 860px)').matches) {
      panel.style.top = '';
      panel.style.right = '';
      return;
    }
    const r = bar.getBoundingClientRect();
    panel.style.top = `${Math.round(r.bottom + 8)}px`;
    panel.style.right = `${Math.max(8, Math.round(window.innerWidth - r.right))}px`;
  };

  const setOpen = (open: boolean) => {
    if (open) place();
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };

  const render = (tracks: Track[], current: number) => {
    const focused = listEl.contains(document.activeElement)
      ? (document.activeElement as HTMLElement).dataset.i
      : undefined;
    listEl.innerHTML = '';
    const count = panel.querySelector('.pl-count');
    if (count) count.textContent = `${tracks.length} TRACKS`;
    const order = tracks.map((_, i) => i).filter((i) => i !== current);
    if (tracks[current]) order.unshift(current);
    order.forEach((i, position) => {
      const t = tracks[i];
      const li = document.createElement('li');
      li.className = i === current ? 'on' : '';
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.i = String(i);

      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = String(position + 1).padStart(2, '0');

      const cv = document.createElement('span');
      cv.className = 'cv';
      if (t.cover) {
        const im = document.createElement('img');
        im.loading = 'lazy';
        im.decoding = 'async';
        im.alt = '';
        im.src = coverOf(t.cover);
        cv.append(im);
      }

      const tx = document.createElement('span');
      tx.className = 'tx';
      const name = document.createElement('span');
      name.className = 'nm';
      name.textContent = t.name;
      const ar = document.createElement('span');
      ar.className = 'ar';
      ar.textContent = t.artist;
      tx.append(name, ar);

      b.append(n, cv, tx);
      li.append(b);
      listEl.append(li);
    });
    if (focused !== undefined) {
      listEl.querySelector<HTMLButtonElement>(`button[data-i="${focused}"]`)?.focus({ preventScroll: true });
    }
  };

  window.addEventListener('resize', () => !panel.hidden && place());
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(Boolean(panel.hidden));
  });
  document.addEventListener('click', (e) => {
    if (panel.hidden) return;
    const t = e.target as Node;
    if (!panel.contains(t) && !button.contains(t)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) setOpen(false);
  });
  listEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-i]');
    if (b) {
      // Rendering replaces the clicked node, which would look like an outside click after bubbling.
      e.stopPropagation();
      onPick(Number(b.dataset.i));
    }
  });

  return { render };
}
