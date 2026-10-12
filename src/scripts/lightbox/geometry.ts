export const MIN_SCALE = 0.4;
export const MAX_SCALE = 6;
const NEIGHBOR_SCALE = 0.92;
const MAX_FIT_UPSCALE = 3;
const SNAP_TO_FIT = 0.03;

export type Size = { width: number; height: number };
export type View = { scale: number; tx: number; ty: number };
export type Rooms = { prev: number; next: number };
export type SwipeOutcome = 1 | -1 | 'back';

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function fitSize(natural: Size, box: Size): Size | null {
  if (!natural.width || !natural.height || box.width <= 0 || box.height <= 0) return null;
  const k = Math.min(box.width / natural.width, box.height / natural.height, MAX_FIT_UPSCALE);
  return { width: Math.round(natural.width * k), height: Math.round(natural.height * k) };
}

export function panLimits(image: Size, stage: Size, scale: number): { x: number; y: number } {
  return {
    x: Math.max(0, (image.width * scale - stage.width) / 2),
    y: Math.max(0, (image.height * scale - stage.height) / 2),
  };
}

export function zoomAround(view: View, target: number, px: number, py: number, image: Size, stage: Size): View {
  const next = clamp(target, MIN_SCALE, MAX_SCALE);
  const k = next / view.scale;
  let tx = px - (px - view.tx) * k;
  let ty = py - (py - view.ty) * k;
  let scale = next;
  if (Math.abs(scale - 1) < SNAP_TO_FIT) scale = 1;
  if (scale <= 1.001) {
    tx = 0;
    ty = 0;
  }
  const limits = panLimits(image, stage, scale);
  return { scale, tx: clamp(tx, -limits.x, limits.x), ty: clamp(ty, -limits.y, limits.y) };
}

export function neighborDistances(current: number, prev: number | null, next: number | null, gap: number): Rooms {
  const to = (width: number | null) => (width === null ? 0 : current / 2 + gap + (width * NEIGHBOR_SCALE) / 2);
  return { prev: to(prev), next: to(next) };
}

export function dragTrack(dx: number, rooms: Rooms): { trackX: number; progress: number; focusDir: 1 | -1 | 0 } {
  const dir: 1 | -1 = dx < 0 ? 1 : -1;
  const room = dir === 1 ? rooms.next : rooms.prev;
  const trackX = room > 0 ? clamp(dx, -room, room) : dx * 0.25;
  return {
    trackX,
    progress: room > 0 ? Math.min(1, Math.abs(trackX) / room) : 0,
    focusDir: room > 0 ? dir : 0,
  };
}

export function swipeOutcome(dx: number, elapsedMs: number, rooms: Rooms, moved: boolean): SwipeOutcome | null {
  if (!moved) return null;
  const dir: 1 | -1 = dx < 0 ? 1 : -1;
  const room = dir === 1 ? rooms.next : rooms.prev;
  const far = room > 0 && Math.abs(dx) > Math.min(room * 0.25, 120);
  const fast = Math.abs(dx) > 40 && Math.abs(dx) / Math.max(elapsedMs, 1) > 0.5;
  return (far || fast) && room > 0 ? dir : 'back';
}
