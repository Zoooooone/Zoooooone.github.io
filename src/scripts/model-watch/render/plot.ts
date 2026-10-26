import { h, svg } from '@/scripts/core/dom';
import { hoverCard } from '../chart-hover';

const LOG_TICKS = [0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100, 300, 1000, 3000];
const FALLBACK_WIDTH = 640;
const MIN_WIDTH = 280;
const TICKS_WANTED = 5;

// The chart is drawn at the pixel size of its panel instead of being scaled, so text and dots keep their size.
export function geometry(width: number, { right = 24 }: { right?: number } = {}) {
  const w = Math.max(MIN_WIDTH, Math.floor(width) || FALLBACK_WIDTH);
  const pad = { left: 52, right, top: 24, bottom: 46 };
  const height = Math.round(Math.min(Math.max(w * 0.56, 300), 440));
  return {
    w,
    h: height,
    pad,
    area: { left: pad.left, right: w - pad.right, top: pad.top, bottom: height - pad.bottom },
  };
}
export type Geometry = ReturnType<typeof geometry>;

export interface Axis {
  at: (value: number) => number;
  ticks: number[];
}

function niceStep(span: number): number {
  if (!(span > 0)) return 1;
  const raw = span / TICKS_WANTED;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const share = raw / magnitude;
  return (share < 1.5 ? 1 : share < 3 ? 2 : share < 7 ? 5 : 10) * magnitude;
}

export function linearAxis(min: number, max: number, from: number, to: number, step = niceStep(max - min)): Axis {
  const lo = Math.floor(min / step) * step;
  const hi = Math.max(lo + step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 1e9) / 1e9);
  return { at: (v) => from + ((v - lo) / (hi - lo)) * (to - from), ticks };
}

export function logAxis(min: number, max: number, from: number, to: number): Axis {
  const lo = Math.log10(min) - 0.08;
  const hi = Math.log10(max) + 0.08;
  return {
    at: (v) => from + ((Math.log10(v) - lo) / (hi - lo || 1)) * (to - from),
    ticks: LOG_TICKS.filter((t) => Math.log10(t) >= lo && Math.log10(t) <= hi),
  };
}

const MONTH = 30.44 * 24 * 60 * 60 * 1000;
const MONTH_STEPS = [1, 3, 6, 12, 24];
const TICK_SPACING = 64;

export function timeAxis(min: number, max: number, from: number, to: number) {
  const months = (max - min) / MONTH;
  const step = MONTH_STEPS.find((s) => (to - from) / Math.max(months / s, 1) >= TICK_SPACING) ?? 24;
  const ticks: number[] = [];
  const first = new Date(min);
  for (let index = first.getUTCFullYear() * 12 + first.getUTCMonth(); ; index++) {
    const t = Date.UTC(Math.floor(index / 12), index % 12, 1);
    if (t > max) break;
    if (t >= min && index % step === 0) ticks.push(t);
  }
  const label = (t: number) => {
    const d = new Date(t);
    return step >= 12
      ? String(d.getUTCFullYear())
      : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  const axis: Axis = { at: (t) => from + ((t - min) / (max - min || 1)) * (to - from), ticks };
  return { axis, label };
}

const tickText = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

export interface PlotSpec {
  label: string;
  x: Axis;
  y: Axis;
  titles: { x: string; y: string };
  format?: { x?: (n: number) => string; y?: (n: number) => string };
}

export function plot(geo: Geometry, { label, x, y, titles, format = {} }: PlotSpec, layers: SVGElement[]): HTMLElement {
  const xText = format.x ?? tickText;
  const yText = format.y ?? String;
  const { pad } = geo;
  return h(
    'div',
    { class: 'chart' },
    svg(
      'svg',
      {
        class: 'scatter',
        width: geo.w,
        height: geo.h,
        viewBox: `0 0 ${geo.w} ${geo.h}`,
        role: 'img',
        'aria-label': label,
      },
      ...y.ticks.map((t) =>
        svg(
          'g',
          { class: 'grid' },
          svg('line', { x1: pad.left, x2: geo.w - pad.right, y1: y.at(t), y2: y.at(t) }),
          svg('text', { x: pad.left - 8, y: y.at(t) + 4, 'text-anchor': 'end' }, yText(t)),
        ),
      ),
      ...x.ticks.map((t) =>
        svg(
          'g',
          { class: 'grid' },
          svg('line', { x1: x.at(t), x2: x.at(t), y1: pad.top, y2: geo.h - pad.bottom }),
          svg('text', { x: x.at(t), y: geo.h - pad.bottom + 18, 'text-anchor': 'middle' }, xText(t)),
        ),
      ),
      svg('text', { class: 'axis-title', x: geo.w - pad.right, y: geo.h - 6, 'text-anchor': 'end' }, titles.x),
      svg('text', { class: 'axis-title', x: pad.left, y: 14 }, titles.y),
      ...layers,
      hoverCard(),
    ),
  );
}
