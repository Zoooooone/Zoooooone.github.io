import { thumb } from '@/lib/assets/thumb';

export type LightboxItem = { src: string; title?: string; description?: string };

type Slide = { el: HTMLElement; img: HTMLImageElement };

const MIN = 0.4;
const MAX = 6;
const SNAP_MS = 380;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pad = (n: number) => String(n).padStart(2, '0');

const mid = (src: string) => thumb(src, 1600) ?? src;

export function createLightbox(cleanups: Array<() => void>) {
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `
    <div class="lb-stage"><div class="lb-track"></div></div>
    <div class="cap"></div>
    <div class="lb-tools">
      <button type="button" class="lb-out" aria-label="缩小">−</button>
      <span class="lb-level">100%</span>
      <button type="button" class="lb-in" aria-label="放大">＋</button>
      <button type="button" class="lb-reset" aria-label="适应窗口">FIT</button>
      <button type="button" class="lb-close" aria-label="关闭">✕</button>
    </div>
    <button type="button" class="prev" aria-label="上一张">‹</button>
    <button type="button" class="next" aria-label="下一张">›</button>`;
  document.body.append(box);

  const stage = box.querySelector<HTMLElement>('.lb-stage')!;
  const track = box.querySelector<HTMLElement>('.lb-track')!;
  const cap = box.querySelector<HTMLElement>('.cap')!;
  const level = box.querySelector<HTMLElement>('.lb-level')!;

  let items: LightboxItem[] = [];
  let at = 0;
  let prev: Slide | null = null;
  let cur: Slide | null = null;
  let next: Slide | null = null;
  let img: HTMLImageElement | null = null;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let trackX = 0;
  let dPrev = 0;
  let dNext = 0;
  let animating = false;
  let commitTimer = 0;

  const idx = (i: number) => ((i % items.length) + items.length) % items.length;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gap = () => (window.innerWidth <= 640 ? 12 : 20);

  const apply = (smooth = false) => {
    if (!img) return;
    img.style.transition = smooth ? 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';
    img.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
    level.textContent = `${Math.round(scale * 100)}%`;
    box.classList.toggle('zoomed', Math.abs(scale - 1) > 0.001);
  };

  const bounds = () => {
    if (!img) return { x: 0, y: 0 };
    const s = stage.getBoundingClientRect();
    const w = img.offsetWidth * scale;
    const h = img.offsetHeight * scale;
    return { x: Math.max(0, (w - s.width) / 2), y: Math.max(0, (h - s.height) / 2) };
  };
  const limit = () => {
    const b = bounds();
    tx = clamp(tx, -b.x, b.x);
    ty = clamp(ty, -b.y, b.y);
  };

  const zoomAt = (target: number, cx: number, cy: number, smooth = false) => {
    const s = stage.getBoundingClientRect();
    const px = cx - (s.left + s.width / 2);
    const py = cy - (s.top + s.height / 2);
    const k = clamp(target, MIN, MAX) / scale;
    tx = px - (px - tx) * k;
    ty = py - (py - ty) * k;
    scale = clamp(target, MIN, MAX);
    if (Math.abs(scale - 1) < 0.03) scale = 1;
    if (scale <= 1.001) {
      tx = 0;
      ty = 0;
    }
    limit();
    apply(smooth);
  };
  const zoomCenter = (target: number) => {
    const s = stage.getBoundingClientRect();
    zoomAt(target, s.left + s.width / 2, s.top + s.height / 2, true);
  };
  const reset = (smooth = true) => {
    scale = 1;
    tx = 0;
    ty = 0;
    apply(smooth);
  };

  const makeImg = (it: LightboxItem) => {
    const el = document.createElement('img');
    el.className = 'lb-img';
    el.alt = it.description ?? it.title ?? '';
    el.draggable = false;
    el.src = mid(it.src);
    el.addEventListener('error', () => {
      if (!el.src.endsWith(encodeURI(it.src))) el.src = it.src;
    });
    el.addEventListener('load', () => layout());
    return el;
  };

  const upgrade = (slide: Slide, it: LightboxItem) => {
    const hi = new Image();
    hi.src = it.src;
    void hi.decode?.().then(
      () => {
        if (slide.img.isConnected) slide.img.src = it.src;
      },
      () => {},
    );
  };

  const makeSlide = (i: number): Slide => {
    const el = document.createElement('div');
    el.className = 'lb-slide nb';
    const im = makeImg(items[idx(i)]);
    el.append(im);
    track.append(el);
    return { el, img: im };
  };

  /**
   * Sets the image to explicit "fit to window" pixel sizes.
   * max-width / max-height cannot be relied on: when the thumbnail (1600px) is smaller than the stage it renders at natural
   * size, then jumps to fill the stage once the original loads, which looks like "switch, then zoom a little".
   * With explicit sizes the thumbnail and the original always display at the same size.
   */
  const fit = (s: Slide) => {
    const im = s.img;
    if (!im.naturalWidth || !im.naturalHeight) return;
    const cs = getComputedStyle(s.el);
    const w = s.el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = s.el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (w <= 0 || h <= 0) return;
    const k = Math.min(w / im.naturalWidth, h / im.naturalHeight, 3);
    im.style.width = `${Math.round(im.naturalWidth * k)}px`;
    im.style.height = `${Math.round(im.naturalHeight * k)}px`;
  };

  const widthOf = (s: Slide) => s.img.offsetWidth || stage.clientWidth * 0.6;

  const layout = () => {
    if (!cur) return;
    [prev, cur, next].forEach((s) => s && fit(s));
    const cw = widthOf(cur);
    dPrev = prev ? cw / 2 + gap() + (widthOf(prev) * 0.92) / 2 : 0;
    dNext = next ? cw / 2 + gap() + (widthOf(next) * 0.92) / 2 : 0;
    cur.el.style.setProperty('--x', '0px');
    prev?.el.style.setProperty('--x', `${-dPrev}px`);
    next?.el.style.setProperty('--x', `${dNext}px`);
  };

  const paintTrack = () => {
    track.style.transform = `translate3d(${trackX}px, 0, 0)`;
  };

  const paintFocus = (p: number, dir: 1 | -1 | 0) => {
    const target = dir === 1 ? next : dir === -1 ? prev : null;
    if (cur) {
      cur.el.style.setProperty('--o', String(1 - 0.6 * p));
      cur.el.style.setProperty('--s', String(1 - 0.08 * p));
    }
    if (target) {
      target.el.style.setProperty('--o', String(0.4 + 0.6 * p));
      target.el.style.setProperty('--s', String(0.92 + 0.08 * p));
    }
  };
  const clearFocus = () => {
    [prev, cur, next].forEach((s) => {
      s?.el.style.removeProperty('--o');
      s?.el.style.removeProperty('--s');
    });
  };

  const caption = () => {
    const it = items[at];
    const text = [it.title, it.description].filter(Boolean).join(' · ');
    cap.innerHTML = '';
    const counter = document.createElement('span');
    counter.className = 'counter';
    counter.textContent = `${pad(at + 1)} / ${pad(items.length)}`;
    const label = document.createElement('span');
    label.textContent = text;
    cap.append(counter, label);
  };

  const commit = (dir: 1 | -1) => {
    window.clearTimeout(commitTimer);
    box.classList.remove('lb-snap');
    at = idx(at + dir);
    if (dir === 1) {
      prev?.el.remove();
      prev = cur;
      cur = next;
      next = makeSlide(at + 1);
    } else {
      next?.el.remove();
      next = cur;
      cur = prev;
      prev = makeSlide(at - 1);
    }
    clearFocus();
    [prev, next].forEach((s) => s?.el.classList.add('nb'));
    cur!.el.classList.remove('nb');
    img = cur!.img;
    scale = 1;
    tx = 0;
    ty = 0;
    trackX = 0;
    paintTrack();
    apply(false);
    layout();
    caption();
    upgrade(cur!, items[at]);
    animating = false;
  };

  const slideTo = (dir: 1 | -1) => {
    if (items.length < 2 || animating) return;
    animating = true;
    reset(false);
    const dist = dir === 1 ? dNext : dPrev;
    if (reduced()) {
      trackX = -dir * dist;
      paintTrack();
      commit(dir);
      return;
    }
    box.classList.add('lb-snap');
    trackX = -dir * dist;
    paintTrack();
    paintFocus(1, dir);
    // Do not rely on transitionend to finish: transitions may not fire in a background tab, so a timer backs it up
    commitTimer = window.setTimeout(() => commit(dir), SNAP_MS + 20);
  };

  const snapBack = () => {
    animating = true;
    box.classList.add('lb-snap');
    trackX = 0;
    paintTrack();
    clearFocus();
    window.clearTimeout(commitTimer);
    commitTimer = window.setTimeout(() => {
      box.classList.remove('lb-snap');
      animating = false;
    }, SNAP_MS + 20);
  };

  const close = () => {
    box.classList.remove('open');
    document.documentElement.classList.remove('lb-open');
  };

  const pointers = new Map<number, { x: number; y: number }>();
  let pinch: { dist: number; scale: number } | null = null;
  let drag: { x: number; y: number; tx: number; ty: number; moved: boolean } | null = null;
  let swipe: { t: number; dx: number } | null = null;

  const dist = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const mid2 = () => {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  const hit = (el: HTMLElement | undefined, x: number, y: number) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  stage.addEventListener('pointerdown', (e) => {
    if (animating) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      pinch = { dist: dist(), scale };
      drag = null;
      swipe = null;
      trackX = 0;
      paintTrack();
      clearFocus();
    } else {
      drag = { x: e.clientX, y: e.clientY, tx, ty, moved: false };
      swipe = scale <= 1.001 ? { t: performance.now(), dx: 0 } : null;
    }
  });

  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch && pointers.size === 2) {
      const m = mid2();
      zoomAt(pinch.scale * (dist() / pinch.dist), m.x, m.y);
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;

    if (scale > 1.001) {
      tx = drag.tx + dx;
      ty = drag.ty + dy;
      limit();
      apply(false);
      box.classList.add('dragging');
    } else if (swipe) {
      swipe.dx = dx;
      const dir: 1 | -1 = dx < 0 ? 1 : -1;
      const room = dir === 1 ? dNext : dPrev;
      trackX = room > 0 ? clamp(dx, -room, room) : dx * 0.25;
      paintTrack();
      paintFocus(room > 0 ? Math.min(1, Math.abs(trackX) / room) : 0, room > 0 ? dir : 0);
    }
  });

  const end = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    box.classList.remove('dragging');
    if (pointers.size < 2) pinch = null;

    if (swipe && pointers.size === 0) {
      const dt = performance.now() - swipe.t;
      const dir: 1 | -1 = swipe.dx < 0 ? 1 : -1;
      const room = dir === 1 ? dNext : dPrev;
      const far = room > 0 && Math.abs(swipe.dx) > Math.min(room * 0.25, 120);
      const fast = Math.abs(swipe.dx) > 40 && Math.abs(swipe.dx) / Math.max(dt, 1) > 0.5;
      if (drag?.moved && (far || fast) && room > 0) slideTo(dir);
      else if (drag?.moved) snapBack();
    }

    // Decide with pointer events: the stage captures the pointer, so a click target is always the stage and cannot tell what was clicked
    if (drag && !drag.moved && pointers.size === 0 && e.type === 'pointerup') {
      if (hit(cur?.img, e.clientX, e.clientY)) {
        zoomAt(Math.abs(scale - 1) > 0.001 ? 1 : 2.5, e.clientX, e.clientY, true);
      } else if (scale === 1 && hit(next?.img, e.clientX, e.clientY)) slideTo(1);
      else if (scale === 1 && hit(prev?.img, e.clientX, e.clientY)) slideTo(-1);
      else close();
    }
    drag = null;
    swipe = null;
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  stage.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018));
      zoomAt(scale * factor, e.clientX, e.clientY);
    },
    { passive: false },
  );

  box.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('.prev')) slideTo(-1);
    else if (t.closest('.next')) slideTo(1);
    else if (t.closest('.lb-in')) zoomCenter(scale * 1.4);
    else if (t.closest('.lb-out')) zoomCenter(scale / 1.4);
    else if (t.closest('.lb-reset')) reset();
    else if (t.closest('.lb-close')) close();
    else if (t === box) close();
  });

  const onKey = (e: KeyboardEvent) => {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') slideTo(-1);
    else if (e.key === 'ArrowRight') slideTo(1);
    else if (e.key === '+' || e.key === '=') zoomCenter(scale * 1.4);
    else if (e.key === '-' || e.key === '_') zoomCenter(scale / 1.4);
    else if (e.key === '0') reset();
  };
  document.addEventListener('keydown', onKey);
  const onResize = () => {
    layout();
    limit();
    apply(false);
  };
  window.addEventListener('resize', onResize);

  cleanups.push(() => {
    window.clearTimeout(commitTimer);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    document.documentElement.classList.remove('lb-open');
    box.remove();
  });

  return {
    open(list: LightboxItem[], i: number) {
      items = list;
      at = idx(i);
      window.clearTimeout(commitTimer);
      animating = false;
      track.replaceChildren();
      box.classList.remove('lb-snap', 'zoomed', 'dragging');
      trackX = 0;
      paintTrack();
      scale = 1;
      tx = 0;
      ty = 0;

      cur = makeSlide(at);
      cur.el.classList.remove('nb');
      prev = items.length > 1 ? makeSlide(at - 1) : null;
      next = items.length > 1 ? makeSlide(at + 1) : null;
      img = cur.img;
      apply(false);
      layout();
      caption();
      upgrade(cur, items[at]);

      box.classList.add('open');
      document.documentElement.classList.add('lb-open');
      if (!reduced()) {
        cur.img.animate(
          [
            { opacity: 0, transform: 'scale(0.97)' },
            { opacity: 1, transform: 'scale(1)' },
          ],
          { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
        );
      }
    },
  };
}
