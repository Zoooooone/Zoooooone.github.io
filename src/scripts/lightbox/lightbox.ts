import { setScrollLock } from '@/scripts/core/scroll-lock';
import { attachGestures } from './gestures';
import { clamp, neighborDistances, panLimits, zoomAround, type Size } from './geometry';
import { createShell, renderCaption } from './shell';
import { createSlide, fitSlide, upgradeToOriginal, widthOf } from './slides';
import type { LightboxItem, LightboxState, Slide } from './types';

export type { LightboxItem } from './types';

const SNAP_MS = 380;
const ZOOM_STEP = 1.4;

export function createLightbox(cleanups: Array<() => void>) {
  const { box, stage, track, cap, level } = createShell();

  const s: LightboxState = {
    items: [],
    at: 0,
    prev: null,
    cur: null,
    next: null,
    img: null,
    scale: 1,
    tx: 0,
    ty: 0,
    trackX: 0,
    dPrev: 0,
    dNext: 0,
    animating: false,
    commitTimer: 0,
  };

  const idx = (i: number) => ((i % s.items.length) + s.items.length) % s.items.length;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gap = () => (window.innerWidth <= 640 ? 12 : 20);

  const stageSize = (): Size => {
    const r = stage.getBoundingClientRect();
    return { width: r.width, height: r.height };
  };
  const imageSize = (): Size => ({ width: s.img?.offsetWidth ?? 0, height: s.img?.offsetHeight ?? 0 });

  const apply = (smooth = false) => {
    if (!s.img) return;
    s.img.style.transition = smooth ? 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';
    s.img.style.transform = `translate3d(${s.tx}px, ${s.ty}px, 0) scale(${s.scale})`;
    level.textContent = `${Math.round(s.scale * 100)}%`;
    box.classList.toggle('zoomed', Math.abs(s.scale - 1) > 0.001);
  };

  const limit = () => {
    const l = panLimits(imageSize(), stageSize(), s.scale);
    s.tx = clamp(s.tx, -l.x, l.x);
    s.ty = clamp(s.ty, -l.y, l.y);
  };

  const zoomAt = (target: number, cx: number, cy: number, smooth = false) => {
    const r = stage.getBoundingClientRect();
    const view = zoomAround(
      { scale: s.scale, tx: s.tx, ty: s.ty },
      target,
      cx - (r.left + r.width / 2),
      cy - (r.top + r.height / 2),
      imageSize(),
      { width: r.width, height: r.height },
    );
    s.scale = view.scale;
    s.tx = view.tx;
    s.ty = view.ty;
    apply(smooth);
  };

  const zoomCenter = (target: number) => {
    const r = stage.getBoundingClientRect();
    zoomAt(target, r.left + r.width / 2, r.top + r.height / 2, true);
  };

  const reset = (smooth = true) => {
    s.scale = 1;
    s.tx = 0;
    s.ty = 0;
    apply(smooth);
  };

  const layout = () => {
    if (!s.cur) return;
    [s.prev, s.cur, s.next].forEach((slide) => slide && fitSlide(slide));
    const d = neighborDistances(
      widthOf(s.cur, stage),
      s.prev ? widthOf(s.prev, stage) : null,
      s.next ? widthOf(s.next, stage) : null,
      gap(),
    );
    s.dPrev = d.prev;
    s.dNext = d.next;
    s.cur.el.style.setProperty('--x', '0px');
    s.prev?.el.style.setProperty('--x', `${-s.dPrev}px`);
    s.next?.el.style.setProperty('--x', `${s.dNext}px`);
  };

  const makeSlide = (i: number): Slide => createSlide(track, s.items[idx(i)], layout);

  const paintTrack = () => {
    track.style.transform = `translate3d(${s.trackX}px, 0, 0)`;
  };

  const paintFocus = (p: number, dir: 1 | -1 | 0) => {
    const target = dir === 1 ? s.next : dir === -1 ? s.prev : null;
    if (s.cur) {
      s.cur.el.style.setProperty('--o', String(1 - 0.6 * p));
      s.cur.el.style.setProperty('--s', String(1 - 0.08 * p));
    }
    if (target) {
      target.el.style.setProperty('--o', String(0.4 + 0.6 * p));
      target.el.style.setProperty('--s', String(0.92 + 0.08 * p));
    }
  };
  const clearFocus = () => {
    [s.prev, s.cur, s.next].forEach((slide) => {
      slide?.el.style.removeProperty('--o');
      slide?.el.style.removeProperty('--s');
    });
  };

  const caption = () => renderCaption(cap, s.items[s.at], s.at, s.items.length);

  const commit = (dir: 1 | -1) => {
    window.clearTimeout(s.commitTimer);
    box.classList.remove('lb-snap');
    s.at = idx(s.at + dir);
    if (dir === 1) {
      s.prev?.el.remove();
      s.prev = s.cur;
      s.cur = s.next;
      s.next = makeSlide(s.at + 1);
    } else {
      s.next?.el.remove();
      s.next = s.cur;
      s.cur = s.prev;
      s.prev = makeSlide(s.at - 1);
    }
    clearFocus();
    [s.prev, s.next].forEach((slide) => slide?.el.classList.add('nb'));
    s.cur!.el.classList.remove('nb');
    s.img = s.cur!.img;
    s.scale = 1;
    s.tx = 0;
    s.ty = 0;
    s.trackX = 0;
    paintTrack();
    apply(false);
    layout();
    caption();
    upgradeToOriginal(s.cur!, s.items[s.at]);
    s.animating = false;
  };

  const slideTo = (dir: 1 | -1) => {
    if (s.items.length < 2 || s.animating) return;
    s.animating = true;
    reset(false);
    const dist = dir === 1 ? s.dNext : s.dPrev;
    if (reduced()) {
      s.trackX = -dir * dist;
      paintTrack();
      commit(dir);
      return;
    }
    box.classList.add('lb-snap');
    s.trackX = -dir * dist;
    paintTrack();
    paintFocus(1, dir);
    // Do not rely on transitionend to finish: transitions may not fire in a background tab, so a timer backs it up
    s.commitTimer = window.setTimeout(() => commit(dir), SNAP_MS + 20);
  };

  const snapBack = () => {
    s.animating = true;
    box.classList.add('lb-snap');
    s.trackX = 0;
    paintTrack();
    clearFocus();
    window.clearTimeout(s.commitTimer);
    s.commitTimer = window.setTimeout(() => {
      box.classList.remove('lb-snap');
      s.animating = false;
    }, SNAP_MS + 20);
  };

  const close = () => {
    box.classList.remove('open');
    setScrollLock('lb-open', false);
  };

  attachGestures({
    stage,
    box,
    state: s,
    zoomAt,
    panTo(tx, ty) {
      s.tx = tx;
      s.ty = ty;
      limit();
      apply(false);
    },
    paintTrack,
    paintFocus,
    clearFocus,
    slideTo,
    snapBack,
    close,
  });

  box.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('.prev')) slideTo(-1);
    else if (t.closest('.next')) slideTo(1);
    else if (t.closest('.lb-in')) zoomCenter(s.scale * ZOOM_STEP);
    else if (t.closest('.lb-out')) zoomCenter(s.scale / ZOOM_STEP);
    else if (t.closest('.lb-reset')) reset();
    else if (t.closest('.lb-close')) close();
    else if (t === box) close();
  });

  const onKey = (e: KeyboardEvent) => {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') slideTo(-1);
    else if (e.key === 'ArrowRight') slideTo(1);
    else if (e.key === '+' || e.key === '=') zoomCenter(s.scale * ZOOM_STEP);
    else if (e.key === '-' || e.key === '_') zoomCenter(s.scale / ZOOM_STEP);
    else if (e.key === '0') reset();
  };
  const onResize = () => {
    layout();
    limit();
    apply(false);
  };
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  cleanups.push(() => {
    window.clearTimeout(s.commitTimer);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    setScrollLock('lb-open', false);
    box.remove();
  });

  return {
    open(list: LightboxItem[], i: number) {
      s.items = list;
      s.at = idx(i);
      window.clearTimeout(s.commitTimer);
      s.animating = false;
      track.replaceChildren();
      box.classList.remove('lb-snap', 'zoomed', 'dragging');
      s.trackX = 0;
      paintTrack();
      s.scale = 1;
      s.tx = 0;
      s.ty = 0;

      s.cur = makeSlide(s.at);
      s.cur.el.classList.remove('nb');
      s.prev = s.items.length > 1 ? makeSlide(s.at - 1) : null;
      s.next = s.items.length > 1 ? makeSlide(s.at + 1) : null;
      s.img = s.cur.img;
      apply(false);
      layout();
      caption();
      upgradeToOriginal(s.cur, s.items[s.at]);

      box.classList.add('open');
      setScrollLock('lb-open', true);
      if (!reduced()) {
        s.cur.img.animate(
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
