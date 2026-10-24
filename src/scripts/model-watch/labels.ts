export interface Dot {
  x: number;
  y: number;
}

export interface LabelCandidate extends Dot {
  text: string;
  priority: number;
}

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface PlacedLabel {
  /** Index in the candidates that were passed in. */
  index: number;
  x: number;
  y: number;
  anchor: 'start' | 'end';
  box: Box;
  leader: boolean;
}

// Matches the label font size in model-watch.css.
const FONT_SIZE = 12;
// The biggest mark is a pinned dot with a ring.
const DOT = 6;
const GAP = 3;
// Wide enough that two names side by side do not read as one phrase.
const LABEL_GAP = 12;
// Rings of growing distance, so the nearest free place wins.
const FAR_DISTANCES = [28, 48, 72, 100];
// Degrees on screen (0 is right, 90 is down), flat angles first, each tried on the right and then mirrored to the left.
const FAR_ANGLES = [0, -15, 15, -30, 30, -45, 45, -60, 60, -75, 75, -90, 90].flatMap((a) =>
  a === 90 || a === -90 ? [a] : [a, 180 - a],
);

// Estimated, because the real width depends on the font that loads: a Latin letter is about 0.6em, a CJK one 1em.
export const textWidth = (text: string) =>
  [...text].reduce((sum, c) => sum + (c.charCodeAt(0) > 0x2e80 ? FONT_SIZE : FONT_SIZE * 0.6), 0);

export const nearestPoint = (dot: Dot, box: Box): Dot => ({
  x: Math.min(Math.max(dot.x, box.left), box.right),
  y: Math.min(Math.max(dot.y, box.top), box.bottom),
});

const overlaps = (a: Box, b: Box) =>
  a.left < b.right + LABEL_GAP &&
  a.right + LABEL_GAP > b.left &&
  a.top < b.bottom + LABEL_GAP / 2 &&
  a.bottom + LABEL_GAP / 2 > b.top;

const touchesDot = (box: Box, dot: Dot) => {
  const near = nearestPoint(dot, box);
  return (dot.x - near.x) ** 2 + (dot.y - near.y) ** 2 < (DOT + 1) ** 2;
};

const LEADER_SAMPLES = 16;

export function segmentHitsBox(from: Dot, to: Dot, box: Box): boolean {
  for (let i = 0; i <= LEADER_SAMPLES; i++) {
    const t = i / LEADER_SAMPLES;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    if (x > box.left - 1 && x < box.right + 1 && y > box.top - 1 && y < box.bottom + 1) return true;
  }
  return false;
}

interface Spot {
  anchor: 'start' | 'end';
  x: number;
  y: number;
  leader: boolean;
}

/** Right of the dot, then left, above before below; after that farther out, where a line leads back to the dot. */
function spotsFor({ x, y }: Dot): Spot[] {
  const near: Spot[] = [
    { anchor: 'start', x: x + DOT + GAP, y: y - DOT, leader: false },
    { anchor: 'start', x: x + DOT + GAP, y: y + FONT_SIZE + 1, leader: false },
    { anchor: 'end', x: x - DOT - GAP, y: y - DOT, leader: false },
    { anchor: 'end', x: x - DOT - GAP, y: y + FONT_SIZE + 1, leader: false },
  ];
  const far = FAR_DISTANCES.flatMap((distance) =>
    FAR_ANGLES.map((degrees): Spot => {
      const radians = (degrees * Math.PI) / 180;
      const right = Math.cos(radians) >= -1e-9;
      const px = x + distance * Math.cos(radians);
      const py = y + distance * Math.sin(radians);
      return { anchor: right ? 'start' : 'end', x: px + (right ? GAP : -GAP), y: py + FONT_SIZE * 0.35, leader: true };
    }),
  );
  return [...near, ...far];
}

/**
 * Puts a label by as many candidates as fit, most important first. `obstacles` are all the dots on the chart,
 * not only the ones that get a label.
 */
export function placeLabels(
  candidates: LabelCandidate[],
  area: Box,
  limit: number,
  obstacles: Dot[] = candidates,
): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  const order = candidates.map((_, index) => index).sort((a, b) => candidates[b].priority - candidates[a].priority);

  for (const index of order) {
    if (placed.length >= limit) break;
    const { text } = candidates[index];
    const width = textWidth(text);

    for (const spot of spotsFor(candidates[index])) {
      const left = spot.anchor === 'start' ? spot.x : spot.x - width;
      const box = { left, right: left + width, top: spot.y - FONT_SIZE, bottom: spot.y + 2 };
      const inside =
        box.left >= area.left && box.right <= area.right && box.top >= area.top && box.bottom <= area.bottom;
      if (!inside || placed.some((p) => overlaps(box, p.box)) || obstacles.some((dot) => touchesDot(box, dot)))
        continue;
      // A line from one label to its dot must not run through another label, nor a label sit on another line.
      const dot = candidates[index];
      const line = nearestPoint(dot, box);
      const crossed = placed.some((p) => {
        const other = candidates[p.index];
        return (
          (p.leader && segmentHitsBox(other, nearestPoint(other, p.box), box)) ||
          (spot.leader && segmentHitsBox(dot, line, p.box))
        );
      });
      if (crossed) continue;
      placed.push({ index, x: spot.x, y: spot.y, anchor: spot.anchor, box, leader: spot.leader });
      break;
    }
  }
  return placed;
}
