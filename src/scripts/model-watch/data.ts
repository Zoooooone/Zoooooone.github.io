import type { LlmModel, MediaCategory } from './types';

const VARIANT = /\s*\(([^)]*)\)\s*$/;

/** The API lists each reasoning setting as its own model, e.g. "X (Max, Default Fallback)" next to "X (High)". */
export const baseName = (name: string) => name.replace(VARIANT, '').trim();
export const variantOf = (name: string) => VARIANT.exec(name)?.[1] ?? '';

/** Models with a price are the ones still offered through an API; the rest are retired or never served. */
export const isListed = (model: LlmModel) => model.price_blended != null;

const beats = (better: 'high' | 'low', a: number, b: number) => (better === 'high' ? a > b : a < b);

export function collapse<T extends { name: string; creator: string }>(
  list: T[],
  value: (item: T) => number | null,
  better: 'high' | 'low' = 'high',
): T[] {
  const best = new Map<string, T>();
  for (const item of list) {
    const key = `${item.creator}\u0000${baseName(item.name)}`;
    const held = best.get(key);
    const v = value(item);
    const w = held ? value(held) : null;
    if (!held || (v != null && (w == null || beats(better, v, w)))) best.set(key, item);
  }
  return [...best.values()];
}

export interface Ranked<T> {
  item: T;
  value: number;
}

export function rank<T>(list: T[], value: (item: T) => number | null, better: 'high' | 'low'): Ranked<T>[] {
  return list
    .flatMap((item) => {
      const v = value(item);
      return v == null ? [] : [{ item, value: v }];
    })
    .sort((a, b) => (better === 'high' ? b.value - a.value : a.value - b.value));
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Indexes of the points no other point beats on both axes. A higher y is always better;
 * `xBetter` says whether a lower x (price) or a higher x (speed) is.
 */
export function pareto(points: Point[], xBetter: 'low' | 'high'): number[] {
  const order = points
    .map((p, i) => ({ ...p, i }))
    .sort((a, b) => (xBetter === 'low' ? a.x - b.x : b.x - a.x) || b.y - a.y);
  const front: number[] = [];
  let top = -Infinity;
  for (const p of order) {
    if (p.y > top) {
      front.push(p.i);
      top = p.y;
    }
  }
  return front;
}

/**
 * The path along the frontier as a staircase: the best y one can get for a given x, which is more honest than a
 * straight line, since no model sits between two frontier points. Points must come from `pareto`.
 */
export function stairs(points: Point[], xBetter: 'low' | 'high'): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  return sorted.flatMap((p, i) => {
    const prev = sorted[i - 1];
    if (!prev) return [p];
    // Price: a model that costs more has to be smarter, so go right first, then up.
    // Speed: a faster model has to be less smart, so go down first, then right.
    return xBetter === 'low' ? [{ x: p.x, y: prev.y }, p] : [{ x: prev.x, y: p.y }, p];
  });
}

export interface MonthBest {
  month: string;
  best: LlmModel;
  value: number;
  top: number;
  record: boolean;
}

export function frontierByMonth(models: LlmModel[], value: (model: LlmModel) => number | null): MonthBest[] {
  const months = new Map<string, { model: LlmModel; value: number }>();
  for (const model of models) {
    const v = value(model);
    if (v == null || !/^\d{4}-\d{2}/.test(model.release_date)) continue;
    const month = model.release_date.slice(0, 7);
    const held = months.get(month);
    if (!held || v > held.value) months.set(month, { model, value: v });
  }
  let top = -Infinity;
  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { model, value: v }]) => {
      const record = v > top;
      top = Math.max(top, v);
      return { month, best: model, value: v, top, record };
    });
}

export function leadingCreators(models: LlmModel[], value: (model: LlmModel) => number | null): string[] {
  const top = new Map<string, number>();
  for (const m of models) {
    const v = value(m);
    if (v != null && v > (top.get(m.creator) ?? -Infinity)) top.set(m.creator, v);
  }
  return [...top.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([creator]) => creator);
}

export interface Release {
  model: LlmModel;
  /** Release date in milliseconds. */
  day: number;
  value: number;
  /** Beat everything this creator had released before. */
  record: boolean;
}

export function releasesOf(models: LlmModel[], creator: string, value: (model: LlmModel) => number | null): Release[] {
  let best = -Infinity;
  return collapse(
    models.filter((m) => m.creator === creator),
    value,
  )
    .flatMap((model) => {
      const v = value(model);
      const day = Date.parse(model.release_date);
      return v == null || Number.isNaN(day) ? [] : [{ model, day, value: v }];
    })
    .sort((a, b) => a.day - b.day || b.value - a.value)
    .map((release) => {
      const record = release.value > best;
      best = Math.max(best, release.value);
      return { ...release, record };
    });
}

export interface CreatorSummary {
  creator: string;
  best: LlmModel;
  models: number;
  latest: string;
}

export function creatorBoard(models: LlmModel[]): CreatorSummary[] {
  const byCreator = new Map<string, LlmModel[]>();
  for (const m of models) byCreator.set(m.creator, [...(byCreator.get(m.creator) ?? []), m]);
  return [...byCreator.entries()]
    .map(([creator, list]) => ({
      creator,
      best: list.reduce((a, b) => ((b.intelligence ?? -1) > (a.intelligence ?? -1) ? b : a)),
      models: new Set(list.map((m) => baseName(m.name))).size,
      latest: list.reduce((a, b) => (b.release_date > a.release_date ? b : a)).release_date,
    }))
    .filter((c) => c.best.intelligence != null)
    .sort((a, b) => b.best.intelligence! - a.best.intelligence!);
}

export const categoryName = (c: MediaCategory) =>
  [c.style_category, c.subject_matter_category, c.format_category].filter(Boolean).join(' · ');

/** Days between two ISO dates (or year-months), counted from the later one back. */
export const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(to.length === 7 ? `${to}-01` : to) - Date.parse(from.length === 7 ? `${from}-01` : from)) / 86_400_000,
  );
