import type { Release } from './data';
import type { LlmModel } from './types';

export const DAY = 24 * 60 * 60 * 1000;

/** How many creators fit on one chart: the number of colours that can still be told apart. */
export const SLOTS = 8;

export type WindowKey = '1y' | '2y' | 'all';

export const WINDOWS: { key: WindowKey; label: string; days: number }[] = [
  { key: '1y', label: '近 1 年', days: 365 },
  { key: '2y', label: '近 2 年', days: 730 },
  { key: 'all', label: '全部', days: Infinity },
];

export interface Series {
  creator: string;
  releases: Release[];
}

export interface Step {
  day: number;
  value: number;
}

/** The most recent release date among all models, which is what "now" means for the data. */
export const latestDay = (models: LlmModel[]) =>
  models.reduce((latest, m) => {
    const day = Date.parse(m.release_date);
    return Number.isNaN(day) ? latest : Math.max(latest, day);
  }, -Infinity);

export function windowStart(key: WindowKey, first: number, last: number): number {
  const days = WINDOWS.find((w) => w.key === key)!.days;
  return Math.max(first, last - days * DAY);
}

/** The best value a creator had reached by a moment, or `null` before its first release. */
export function levelAt(releases: Release[], time: number): number | null {
  let best: number | null = null;
  for (const r of releases) {
    if (r.day > time) break;
    best = best === null ? r.value : Math.max(best, r.value);
  }
  return best;
}

/** Corners of a creator's running best between two moments: where it stood at the start, then each new high. */
export function stepsBetween(releases: Release[], start: number, end: number): Step[] {
  const level = levelAt(releases, start);
  const steps: Step[] = level === null ? [] : [{ day: start, value: level }];
  for (const r of releases) if (r.record && r.day > start && r.day <= end) steps.push({ day: r.day, value: r.value });
  return steps;
}

export interface Milestone {
  threshold: number;
  reached: { creator: string; day: number }[];
  missing: string[];
}

export function milestones(series: Series[], thresholds: number[]): Milestone[] {
  return thresholds.map((threshold) => {
    const reached = series
      .flatMap(({ creator, releases }) => {
        const hit = releases.find((r) => r.value >= threshold);
        return hit ? [{ creator, day: hit.day }] : [];
      })
      .sort((a, b) => a.day - b.day || a.creator.localeCompare(b.creator));
    const got = new Set(reached.map((r) => r.creator));
    return { threshold, reached, missing: series.map((s) => s.creator).filter((c) => !got.has(c)) };
  });
}

export function assignSlots(current: Record<string, number>, creators: string[]): Record<string, number> {
  const next: Record<string, number> = {};
  const taken = new Set<number>();
  for (const creator of creators) {
    if (creator in current) {
      next[creator] = current[creator];
      taken.add(current[creator]);
    }
  }
  for (const creator of creators) {
    if (creator in next) continue;
    let slot = 0;
    while (taken.has(slot)) slot++;
    next[creator] = slot;
    taken.add(slot);
  }
  return next;
}

export function spread(ys: number[], gap: number, min: number, max: number): number[] {
  const order = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
  const out = [...ys];
  let above = -Infinity;
  for (const i of order) {
    out[i] = Math.max(ys[i], above + gap, min);
    above = out[i];
  }
  let below = Infinity;
  for (const i of [...order].reverse()) {
    out[i] = Math.min(out[i], below - gap, max);
    below = out[i];
  }
  return out;
}
