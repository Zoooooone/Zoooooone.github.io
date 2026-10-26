import { svg } from '@/scripts/core/dom';
import { baseName } from '../data';
import { nearestPoint, placeLabels, type Dot } from '../labels';
import type { Geometry } from './plot';

// From back to front: plain dots are the background, the frontier and the lit creator stand out, the pick is on top.
type Kind = 'plain' | 'lit' | 'best' | 'pinned';
const STACK: Kind[] = ['plain', 'lit', 'best', 'pinned'];
const RADIUS: Record<Kind, number> = { plain: 2.75, lit: 4.5, best: 5.5, pinned: 7 };
const HIT_RADIUS = 10;

export interface Mark extends Dot {
  id: string;
  name: string;
  /** Second line of the hover card. */
  line: string;
  kind: Kind;
  /** Settles who is labelled first among marks of the same kind. */
  weight: number;
  dim?: boolean;
  /** `false` keeps the mark out of the permanent labels however well it ranks. */
  label?: boolean;
  /** Hue (0 to 360) of the series it belongs to; the stylesheet turns it into a colour for the current theme. */
  hue?: number;
}

export const drawMarks = (marks: Mark[]) =>
  [...marks]
    .sort((a, b) => STACK.indexOf(a.kind) - STACK.indexOf(b.kind))
    .map((m) =>
      svg(
        'g',
        {
          class: `pt ${m.kind}${m.dim ? ' dim' : ''}${m.hue === undefined ? '' : ' series'}`,
          style: m.hue === undefined ? undefined : `--h:${m.hue}`,
          'data-pick': m.id,
          'data-name': m.name,
          'data-line': m.line,
          'data-x': m.x,
          'data-y': m.y,
        },
        // A larger invisible circle, so a small dot is still easy to point at.
        svg('circle', { class: 'hit', cx: m.x, cy: m.y, r: HIT_RADIUS }),
        svg('circle', { class: 'dot', cx: m.x, cy: m.y, r: RADIUS[m.kind] }),
      ),
    );

const priorityOf = ({ kind, weight, label }: Mark): number | null =>
  label === false && kind !== 'pinned'
    ? null
    : kind === 'pinned'
      ? 3000 + weight
      : kind === 'lit'
        ? 2000 + weight
        : kind === 'best'
          ? 1000 + weight
          : null;

/** How many permanent labels fit; a narrow chart gets fewer instead of smaller text. */
const labelBudget = (w: number) => (w < 460 ? 4 : w < 640 ? 6 : 8);

export function drawLabels(geo: Geometry, marks: Mark[], budget = labelBudget(geo.w)): SVGElement[] {
  const candidates = marks.flatMap((m) => {
    const priority = priorityOf(m);
    return priority === null ? [] : [{ x: m.x, y: m.y, text: baseName(m.name), priority }];
  });
  const placed = placeLabels(candidates, geo.area, budget + (marks.some((m) => m.kind === 'pinned') ? 1 : 0), marks);

  const lines = placed
    .filter((label) => label.leader)
    .map((label) => {
      const dot = candidates[label.index];
      const end = nearestPoint(dot, label.box);
      return svg('line', { class: 'leader', x1: dot.x, y1: dot.y, x2: end.x, y2: end.y });
    });
  const texts = placed.map((label) =>
    svg(
      'text',
      { class: 'dot-label', x: label.x, y: label.y, 'text-anchor': label.anchor },
      candidates[label.index].text,
    ),
  );
  return [...lines, ...texts];
}
