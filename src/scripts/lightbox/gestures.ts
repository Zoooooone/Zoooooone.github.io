import { dragTrack, swipeOutcome } from './geometry';
import type { LightboxState } from './types';

export type GestureHost = {
  stage: HTMLElement;
  box: HTMLElement;
  state: LightboxState;
  zoomAt(target: number, cx: number, cy: number, smooth?: boolean): void;
  panTo(tx: number, ty: number): void;
  paintTrack(): void;
  paintFocus(progress: number, dir: 1 | -1 | 0): void;
  clearFocus(): void;
  slideTo(dir: 1 | -1): void;
  snapBack(): void;
  close(): void;
};

type Point = { x: number; y: number };

const inside = (el: HTMLElement | undefined, x: number, y: number) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
};

export function attachGestures(host: GestureHost) {
  const { stage, box, state: s } = host;
  const pointers = new Map<number, Point>();
  let pinch: { dist: number; scale: number } | null = null;
  let drag: { x: number; y: number; tx: number; ty: number; moved: boolean } | null = null;
  let swipe: { t: number; dx: number } | null = null;

  const spread = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const center = () => {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  const rooms = () => ({ prev: s.dPrev, next: s.dNext });

  stage.addEventListener('pointerdown', (e) => {
    if (s.animating) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      pinch = { dist: spread(), scale: s.scale };
      drag = null;
      swipe = null;
      s.trackX = 0;
      host.paintTrack();
      host.clearFocus();
    } else {
      drag = { x: e.clientX, y: e.clientY, tx: s.tx, ty: s.ty, moved: false };
      swipe = s.scale <= 1.001 ? { t: performance.now(), dx: 0 } : null;
    }
  });

  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch && pointers.size === 2) {
      const m = center();
      host.zoomAt(pinch.scale * (spread() / pinch.dist), m.x, m.y);
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;

    if (s.scale > 1.001) {
      host.panTo(drag.tx + dx, drag.ty + dy);
      box.classList.add('dragging');
    } else if (swipe) {
      swipe.dx = dx;
      const track = dragTrack(dx, rooms());
      s.trackX = track.trackX;
      host.paintTrack();
      host.paintFocus(track.progress, track.focusDir);
    }
  });

  const end = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    box.classList.remove('dragging');
    if (pointers.size < 2) pinch = null;

    if (swipe && pointers.size === 0) {
      const outcome = swipeOutcome(swipe.dx, performance.now() - swipe.t, rooms(), Boolean(drag?.moved));
      if (outcome === 'back') host.snapBack();
      else if (outcome) host.slideTo(outcome);
    }

    // The stage captures the pointer, so a click target is always the stage; decide on pointer events.
    if (drag && !drag.moved && pointers.size === 0 && e.type === 'pointerup') {
      if (inside(s.cur?.img, e.clientX, e.clientY)) {
        host.zoomAt(Math.abs(s.scale - 1) > 0.001 ? 1 : 2.5, e.clientX, e.clientY, true);
      } else if (s.scale === 1 && inside(s.next?.img, e.clientX, e.clientY)) host.slideTo(1);
      else if (s.scale === 1 && inside(s.prev?.img, e.clientX, e.clientY)) host.slideTo(-1);
      else host.close();
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
      host.zoomAt(s.scale * factor, e.clientX, e.clientY);
    },
    { passive: false },
  );
}
