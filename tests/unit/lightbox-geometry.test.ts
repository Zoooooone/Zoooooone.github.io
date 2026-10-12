import { describe, expect, it } from 'vitest';
import {
  clamp,
  dragTrack,
  fitSize,
  MAX_SCALE,
  MIN_SCALE,
  neighborDistances,
  panLimits,
  swipeOutcome,
  zoomAround,
} from '@/scripts/lightbox/geometry';

const stage = { width: 1000, height: 600 };

describe('fitSize', () => {
  it('fits the limiting side and keeps the aspect ratio', () => {
    expect(fitSize({ width: 2000, height: 1000 }, stage)).toEqual({ width: 1000, height: 500 });
    expect(fitSize({ width: 1000, height: 2000 }, stage)).toEqual({ width: 300, height: 600 });
  });

  it('enlarges small images by at most 3x', () => {
    expect(fitSize({ width: 100, height: 50 }, stage)).toEqual({ width: 300, height: 150 });
  });

  it('returns null while sizes are unknown', () => {
    expect(fitSize({ width: 0, height: 0 }, stage)).toBeNull();
    expect(fitSize({ width: 100, height: 100 }, { width: 0, height: 100 })).toBeNull();
  });
});

describe('panLimits', () => {
  it('is zero while the image fits and grows once it is larger than the stage', () => {
    expect(panLimits({ width: 800, height: 500 }, stage, 1)).toEqual({ x: 0, y: 0 });
    expect(panLimits({ width: 800, height: 500 }, stage, 2)).toEqual({ x: 300, y: 200 });
  });
});

describe('zoomAround', () => {
  const image = { width: 800, height: 500 };
  const start = { scale: 1, tx: 0, ty: 0 };

  it('keeps the point under the pointer fixed while zooming in', () => {
    const px = 200;
    const py = -100;
    const out = zoomAround(start, 2, px, py, image, stage);
    expect(out.scale).toBe(2);
    expect(px - out.tx).toBeCloseTo((px - start.tx) * 2, 5);
    expect(py - out.ty).toBeCloseTo((py - start.ty) * 2, 5);
  });

  it('clamps the zoom to the allowed range', () => {
    expect(zoomAround(start, 100, 0, 0, image, stage).scale).toBe(MAX_SCALE);
    expect(zoomAround(start, 0.01, 0, 0, image, stage).scale).toBe(MIN_SCALE);
  });

  it('snaps to exactly 100% near fit and recenters', () => {
    const out = zoomAround({ scale: 1.5, tx: 40, ty: 20 }, 1.02, 10, 10, image, stage);
    expect(out).toEqual({ scale: 1, tx: 0, ty: 0 });
  });

  it('never lets the image be dragged beyond its edges', () => {
    const out = zoomAround(start, 2, 5000, 5000, image, stage);
    const limits = panLimits(image, stage, out.scale);
    expect(Math.abs(out.tx)).toBeLessThanOrEqual(limits.x);
    expect(Math.abs(out.ty)).toBeLessThanOrEqual(limits.y);
  });
});

describe('neighborDistances', () => {
  it('places neighbors at half widths plus the gap, and is 0 without a neighbor', () => {
    const d = neighborDistances(400, 300, null, 20);
    expect(d.prev).toBeCloseTo(200 + 20 + (300 * 0.92) / 2, 5);
    expect(d.next).toBe(0);
  });
});

describe('dragTrack', () => {
  const rooms = { prev: 300, next: 500 };

  it('follows the finger up to the neighbor distance', () => {
    expect(dragTrack(-100, rooms)).toEqual({ trackX: -100, progress: 0.2, focusDir: 1 });
    expect(dragTrack(-900, rooms)).toEqual({ trackX: -500, progress: 1, focusDir: 1 });
    expect(dragTrack(120, rooms)).toEqual({ trackX: 120, progress: 0.4, focusDir: -1 });
  });

  it('resists when there is no neighbor in that direction', () => {
    const out = dragTrack(100, { prev: 0, next: 500 });
    expect(out).toEqual({ trackX: 25, progress: 0, focusDir: 0 });
  });
});

describe('swipeOutcome', () => {
  const rooms = { prev: 400, next: 400 };

  it('ignores taps', () => {
    expect(swipeOutcome(0, 100, rooms, false)).toBeNull();
  });

  it('pages when the drag went far enough', () => {
    expect(swipeOutcome(-120, 600, rooms, true)).toBe(1);
    expect(swipeOutcome(150, 600, rooms, true)).toBe(-1);
  });

  it('pages on a short, fast flick', () => {
    expect(swipeOutcome(-60, 80, rooms, true)).toBe(1);
  });

  it('springs back on a short, slow drag or when there is nowhere to go', () => {
    expect(swipeOutcome(-30, 600, rooms, true)).toBe('back');
    expect(swipeOutcome(-300, 100, { prev: 400, next: 0 }, true)).toBe('back');
  });
});

describe('clamp', () => {
  it('limits a value to a range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
