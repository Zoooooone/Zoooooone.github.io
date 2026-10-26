import { describe, expect, it } from 'vitest';
import {
  baseName,
  collapse,
  creatorBoard,
  frontierByMonth,
  leadingCreators,
  pareto,
  rank,
  releasesOf,
  stairs,
  variantOf,
} from '@/scripts/model-watch/data';
import { nearestPoint, placeLabels, segmentHitsBox, textWidth, type Box } from '@/scripts/model-watch/labels';
import { formatPrice, formatSeconds, formatShare, metricsFor } from '@/scripts/model-watch/metrics';
import type { LlmModel } from '@/scripts/model-watch/types';

const model = (over: Partial<LlmModel>): LlmModel => ({
  id: over.name ?? 'm',
  name: 'M',
  slug: '',
  creator_id: '',
  creator: 'Acme',
  release_date: '2026-01-01',
  intelligence: null,
  coding: null,
  math: null,
  price_blended: null,
  price_input: null,
  price_output: null,
  tps: null,
  ttft: null,
  ttfat: null,
  evaluations: {},
  ...over,
});

describe('model watch data', () => {
  it('splits the reasoning setting off the name', () => {
    expect(baseName('Nova 2 (Max, Default Fallback)')).toBe('Nova 2');
    expect(variantOf('Nova 2 (Max, Default Fallback)')).toBe('Max, Default Fallback');
    expect(baseName('Nova (Lite) Pro')).toBe('Nova (Lite) Pro');
    expect(variantOf('Nova')).toBe('');
  });

  it('keeps the best variant of each model per creator', () => {
    const list = [
      model({ name: 'Nova (High)', intelligence: 40, price_blended: 2 }),
      model({ name: 'Nova (Max)', intelligence: 50, price_blended: 6 }),
      model({ name: 'Nova (Low)', intelligence: null, price_blended: 1 }),
      model({ name: 'Nova (Max)', creator: 'Other', intelligence: 10 }),
    ];
    expect(collapse(list, (m) => m.intelligence).map((m) => `${m.creator}/${m.name}`)).toEqual([
      'Acme/Nova (Max)',
      'Other/Nova (Max)',
    ]);
    expect(collapse(list, (m) => m.price_blended, 'low')[0].name).toBe('Nova (Low)');
  });

  it('ranks by a value in either direction and leaves out missing values', () => {
    const list = [model({ name: 'a', tps: 10 }), model({ name: 'b' }), model({ name: 'c', tps: 30 })];
    expect(rank(list, (m) => m.tps, 'high').map((r) => r.item.name)).toEqual(['c', 'a']);
    expect(rank(list, (m) => m.tps, 'low').map((r) => r.value)).toEqual([10, 30]);
  });

  it('finds the price and speed frontier', () => {
    const points = [
      { x: 1, y: 30 },
      { x: 2, y: 25 },
      { x: 3, y: 50 },
      { x: 10, y: 45 },
      { x: 20, y: 60 },
    ];
    expect(pareto(points, 'low').sort()).toEqual([0, 2, 4]);
    expect(pareto(points, 'high').sort()).toEqual([4]);
  });

  it('draws the frontier as a staircase: the best y still available at each x', () => {
    const price = [
      { x: 1, y: 30 },
      { x: 3, y: 50 },
      { x: 20, y: 60 },
    ];
    expect(stairs(price, 'low')).toEqual([
      { x: 1, y: 30 },
      { x: 3, y: 30 },
      { x: 3, y: 50 },
      { x: 20, y: 50 },
      { x: 20, y: 60 },
    ]);
    // Faster models are less smart, so the steps go down to the right.
    const speed = [
      { x: 20, y: 30 },
      { x: 5, y: 60 },
      { x: 10, y: 45 },
    ];
    expect(stairs(speed, 'high')).toEqual([
      { x: 5, y: 60 },
      { x: 5, y: 45 },
      { x: 10, y: 45 },
      { x: 10, y: 30 },
      { x: 20, y: 30 },
    ]);
    expect(stairs([{ x: 2, y: 2 }], 'low')).toEqual([{ x: 2, y: 2 }]);
  });

  const releases = [
    model({ name: 'a', release_date: '2025-01-10', intelligence: 30, evaluations: { gpqa: 0.5 } }),
    model({ name: 'b', release_date: '2025-01-20', intelligence: 35, evaluations: { gpqa: 0.4 } }),
    model({ name: 'c', release_date: '2025-03-01', intelligence: 33, evaluations: { gpqa: 0.7 } }),
    model({ name: 'd', release_date: '2025-04-01', intelligence: 41 }),
    model({ name: 'e', release_date: '', intelligence: 99 }),
  ];

  it('follows the best intelligence index by release month and marks the records', () => {
    const months = frontierByMonth(releases, (m) => m.intelligence);
    expect(months.map((m) => [m.month, m.best.name, m.value, m.top, m.record])).toEqual([
      ['2025-01', 'b', 35, 35, true],
      ['2025-03', 'c', 33, 35, false],
      ['2025-04', 'd', 41, 41, true],
    ]);
  });

  it('does the same for any other value, and skips models that lack it', () => {
    const months = frontierByMonth(releases, (m) => m.evaluations.gpqa ?? null);
    expect(months.map((m) => [m.month, m.best.name, m.record])).toEqual([
      ['2025-01', 'a', true],
      ['2025-03', 'c', true],
    ]);
  });

  it('sums up each creator by its best model', () => {
    const board = creatorBoard([
      model({ name: 'x (High)', intelligence: 20, release_date: '2026-02-01' }),
      model({ name: 'x (Low)', intelligence: 10, release_date: '2026-05-01' }),
      model({ name: 'y', creator: 'Other', intelligence: 30 }),
      model({ name: 'z', creator: 'Unscored' }),
    ]);
    expect(board.map((c) => [c.creator, c.best.name, c.models, c.latest])).toEqual([
      ['Other', 'y', 1, '2026-01-01'],
      ['Acme', 'x (High)', 1, '2026-05-01'],
    ]);
  });
});

describe('release timeline', () => {
  const lineup = [
    model({ id: 'a1', name: 'Alpha 1', creator: 'Acme', release_date: '2025-01-10', intelligence: 30 }),
    model({ id: 'a2', name: 'Alpha 2 (High)', creator: 'Acme', release_date: '2025-06-01', intelligence: 40 }),
    model({ id: 'a2m', name: 'Alpha 2 (Max)', creator: 'Acme', release_date: '2025-06-01', intelligence: 45 }),
    model({ id: 'a3', name: 'Alpha 3', creator: 'Acme', release_date: '2025-09-01', intelligence: 38 }),
    model({ id: 'a4', name: 'Alpha 4', creator: 'Acme', release_date: '2026-01-01', intelligence: 50 }),
    model({ id: 'b1', name: 'Beta 1', creator: 'Bolt', release_date: '2025-03-01', intelligence: 52 }),
    model({ id: 'c1', name: 'Gamma 1', creator: 'Cora', release_date: '2025-04-01', intelligence: null }),
    model({ id: 'd1', name: 'Delta 1', creator: 'Dune', release_date: 'soon', intelligence: 99 }),
  ];
  const score = (m: LlmModel) => m.intelligence;

  it('orders creators by the best value any of their models reaches, and skips those with none', () => {
    expect(leadingCreators(lineup, score)).toEqual(['Dune', 'Bolt', 'Acme']);
    expect(leadingCreators([], score)).toEqual([]);
  });

  it('breaks a tie by name', () => {
    const tied = [model({ creator: 'Zed', intelligence: 10 }), model({ creator: 'Abe', intelligence: 10 })];
    expect(leadingCreators(tied, score)).toEqual(['Abe', 'Zed']);
  });

  it('lists a creator’s releases oldest first, merges reasoning settings, and marks the new highs', () => {
    const releases = releasesOf(lineup, 'Acme', score);
    expect(releases.map((r) => [r.model.id, r.value, r.record])).toEqual([
      ['a1', 30, true],
      ['a2m', 45, true],
      ['a3', 38, false],
      ['a4', 50, true],
    ]);
    expect(releases[0].day).toBe(Date.parse('2025-01-10'));
  });

  it('leaves out models without a value or a usable date, and gives the best of a same-day pair the record', () => {
    expect(releasesOf(lineup, 'Cora', score)).toEqual([]);
    expect(releasesOf(lineup, 'Dune', score)).toEqual([]);
    const sameDay = [
      model({ id: 'x', name: 'X', release_date: '2025-05-05', intelligence: 20 }),
      model({ id: 'y', name: 'Y', release_date: '2025-05-05', intelligence: 30 }),
    ];
    expect(releasesOf(sameDay, 'Acme', score).map((r) => [r.model.id, r.record])).toEqual([
      ['y', true],
      ['x', false],
    ]);
  });
});

describe('model watch metrics', () => {
  it('offers the indices, every benchmark, speed and price, plus benchmarks the API adds later', () => {
    const metrics = metricsFor([model({ evaluations: { gpqa: 0.5, brand_new_eval: 0.1 } })]);
    const keys = metrics.map((m) => m.key);
    expect(keys.slice(0, 3)).toEqual(['intelligence', 'coding', 'math']);
    expect(keys).toContain('tau2');
    expect(keys).toContain('brand_new_eval');
    expect(keys).not.toContain('artificial_analysis_intelligence_index');
    expect(metrics.find((m) => m.key === 'price_blended')!.better).toBe('low');
    expect(metrics.find((m) => m.key === 'gpqa')!.value(model({ evaluations: { gpqa: 0.5 } }))).toBe(0.5);
  });

  it('formats prices, shares and delays', () => {
    expect(formatPrice(0.5)).toBe('$0.50');
    expect(formatPrice(12.5)).toBe('$12.5');
    expect(formatShare(0.6141)).toBe('61.4%');
    expect(formatSeconds(0.523)).toBe('0.52 s');
    expect(formatSeconds(407.9)).toBe('408 s');
  });
});

describe('chart labels', () => {
  const area = { left: 0, right: 200, top: 0, bottom: 100 };
  const clear = (a: Box, b: Box) => a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom;
  const apart = (box: Box, dot: { x: number; y: number }) => {
    const near = nearestPoint(dot, box);
    return Math.hypot(dot.x - near.x, dot.y - near.y);
  };

  it('gives the most important point its label first and respects the limit', () => {
    const points = [
      { x: 50, y: 20, text: 'Minor', priority: 1 },
      { x: 50, y: 80, text: 'Major', priority: 9 },
    ];
    expect(placeLabels(points, area, 1).map((l) => l.index)).toEqual([1]);
    expect(placeLabels(points, area, 5).map((l) => l.index)).toEqual([1, 0]);
  });

  it('keeps a label next to its dot when there is room, without a line', () => {
    const [label] = placeLabels([{ x: 100, y: 50, text: 'Alpha', priority: 1 }], area, 5);
    expect(label).toMatchObject({ anchor: 'start', leader: false });
    expect(apart(label.box, { x: 100, y: 50 })).toBeLessThan(10);
  });

  it('turns to the left of a point near the right edge', () => {
    const [label] = placeLabels([{ x: 195, y: 50, text: 'Alpha', priority: 1 }], area, 5);
    expect(label.anchor).toBe('end');
    expect(label.box.left).toBeGreaterThanOrEqual(area.left);
    expect(label.box.right).toBeLessThanOrEqual(area.right);
  });

  it('moves a label that would cover another point, and never lets two labels overlap', () => {
    const points = [
      { x: 100, y: 50, text: 'Alpha', priority: 2 },
      { x: 110, y: 45, text: 'Bravo', priority: 1 },
      { x: 104, y: 55, text: 'Charlie', priority: 0 },
    ];
    const placed = placeLabels(points, area, 5);
    // Right of the point is taken by Bravo's dot and below it by Charlie's, so the label goes up and to the left.
    expect(placed[0]).toMatchObject({ index: 0, anchor: 'end', y: 44, leader: false });
    placed.forEach((a, i) => placed.slice(i + 1).forEach((b) => expect(clear(a.box, b.box)).toBe(true)));
    placed.forEach((label) => points.forEach((dot) => expect(apart(label.box, dot)).toBeGreaterThanOrEqual(6)));
  });

  it('goes further out, with a line back to the dot, when every spot beside it is taken', () => {
    const crowd = [
      { x: 115, y: 44 },
      { x: 115, y: 63 },
      { x: 85, y: 44 },
      { x: 85, y: 63 },
    ];
    const [label] = placeLabels([{ x: 100, y: 50, text: 'Alpha', priority: 1 }], area, 5, crowd);
    expect(label.leader).toBe(true);
    expect(apart(label.box, { x: 100, y: 50 })).toBeGreaterThan(10);
    crowd.forEach((dot) => expect(apart(label.box, dot)).toBeGreaterThanOrEqual(6));
  });

  it('never runs a line through another label, even where points crowd together', () => {
    const crowd = Array.from({ length: 9 }, (_, i) => ({
      x: 188 + (i % 2),
      y: 14 + i * 9,
      text: `Model ${i}`,
      priority: 9 - i,
    }));
    const placed = placeLabels(crowd, area, 9);
    expect(placed.length).toBeGreaterThan(3);
    placed.forEach((a, i) =>
      placed.forEach((b, j) => {
        if (i === j) return;
        if (a.leader) expect(segmentHitsBox(crowd[a.index], nearestPoint(crowd[a.index], a.box), b.box)).toBe(false);
      }),
    );
    placed.forEach((a, i) => placed.slice(i + 1).forEach((b) => expect(clear(a.box, b.box)).toBe(true)));
  });

  it('counts dots that carry no label as obstacles', () => {
    const quiet = [{ x: 109, y: 44 }];
    const [label] = placeLabels([{ x: 100, y: 50, text: 'Alpha', priority: 1 }], area, 5, quiet);
    expect(apart(label.box, quiet[0])).toBeGreaterThanOrEqual(6);
  });

  it('leaves a point unlabelled when there is no room', () => {
    const tight = { left: 90, right: 130, top: 40, bottom: 60 };
    expect(placeLabels([{ x: 100, y: 50, text: 'A very long model name', priority: 1 }], tight, 5)).toEqual([]);
  });

  it('finds the point of a box that is nearest to a dot', () => {
    const box = { left: 10, right: 50, top: 10, bottom: 20 };
    expect(nearestPoint({ x: 0, y: 0 }, box)).toEqual({ x: 10, y: 10 });
    expect(nearestPoint({ x: 30, y: 40 }, box)).toEqual({ x: 30, y: 20 });
    expect(nearestPoint({ x: 30, y: 15 }, box)).toEqual({ x: 30, y: 15 });
  });

  it('measures Chinese characters wider than Latin letters', () => {
    expect(textWidth('模型')).toBeGreaterThan(textWidth('ab'));
  });
});
