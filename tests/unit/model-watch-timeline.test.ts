import { describe, expect, it } from 'vitest';
import type { Release } from '@/scripts/model-watch/data';
import { timeAxis } from '@/scripts/model-watch/render/plot';
import {
  assignSlots,
  DAY,
  latestDay,
  levelAt,
  milestones,
  spread,
  stepsBetween,
  windowStart,
} from '@/scripts/model-watch/timeline-data';
import type { LlmModel } from '@/scripts/model-watch/types';

const at = (date: string) => Date.parse(date);
const release = (date: string, value: number, record: boolean): Release => ({
  model: {} as LlmModel,
  day: at(date),
  value,
  record,
});

// 30 at the start of 2025, 45 in June, a weaker 38 in September, 50 at the start of 2026.
const history = [
  release('2025-01-10', 30, true),
  release('2025-06-01', 45, true),
  release('2025-09-01', 38, false),
  release('2026-01-01', 50, true),
];

describe('running best', () => {
  it('is nothing before the first release, then the highest so far', () => {
    expect(levelAt(history, at('2025-01-01'))).toBeNull();
    expect(levelAt(history, at('2025-01-10'))).toBe(30);
    expect(levelAt(history, at('2025-10-01'))).toBe(45);
    expect(levelAt(history, at('2027-01-01'))).toBe(50);
  });

  it('starts a window at the level it had already reached, then adds the new highs inside it', () => {
    expect(stepsBetween(history, at('2025-07-01'), at('2026-12-31'))).toEqual([
      { day: at('2025-07-01'), value: 45 },
      { day: at('2026-01-01'), value: 50 },
    ]);
  });

  it('starts at the first release when the window opens before it', () => {
    expect(stepsBetween(history, at('2024-01-01'), at('2025-12-31'))).toEqual([
      { day: at('2025-01-10'), value: 30 },
      { day: at('2025-06-01'), value: 45 },
    ]);
  });

  it('has no steps for a window that closes before the first release', () => {
    expect(stepsBetween(history, at('2024-01-01'), at('2024-12-31'))).toEqual([]);
  });
});

describe('time window', () => {
  const last = at('2026-10-01');
  it('goes back a year or two from the newest release, or to the first one', () => {
    expect(windowStart('1y', at('2022-11-30'), last)).toBe(last - 365 * DAY);
    expect(windowStart('2y', at('2022-11-30'), last)).toBe(last - 730 * DAY);
    expect(windowStart('all', at('2022-11-30'), last)).toBe(at('2022-11-30'));
  });

  it('never goes back past the first release', () => {
    expect(windowStart('2y', at('2026-01-01'), last)).toBe(at('2026-01-01'));
  });

  it('takes the newest release date of the models as now, and ignores unusable dates', () => {
    const models = [
      { release_date: '2026-05-01' },
      { release_date: 'soon' },
      { release_date: '2026-09-15' },
    ] as LlmModel[];
    expect(latestDay(models)).toBe(at('2026-09-15'));
  });
});

describe('milestones', () => {
  const series = [
    { creator: 'Acme', releases: [release('2025-01-01', 30, true), release('2025-06-01', 50, true)] },
    { creator: 'Bolt', releases: [release('2025-03-01', 40, true)] },
    { creator: 'Cora', releases: [release('2025-02-01', 20, true)] },
  ];

  it('lists who reached a score first, then the others in order, and who never did', () => {
    const [thirty, fifty] = milestones(series, [30, 50]);
    expect(thirty.reached.map((r) => r.creator)).toEqual(['Acme', 'Bolt']);
    expect(thirty.missing).toEqual(['Cora']);
    expect(fifty.reached).toEqual([{ creator: 'Acme', day: at('2025-06-01') }]);
    expect(fifty.missing).toEqual(['Bolt', 'Cora']);
  });

  it('counts the first release that reached the score, not the latest', () => {
    const twice = [{ creator: 'Acme', releases: [release('2025-01-01', 60, true), release('2026-01-01', 70, true)] }];
    expect(milestones(twice, [50])[0].reached[0].day).toBe(at('2025-01-01'));
  });
});

describe('colour slots', () => {
  it('gives the lowest free slot to each new creator', () => {
    expect(assignSlots({}, ['A', 'B', 'C'])).toEqual({ A: 0, B: 1, C: 2 });
  });

  it('keeps the slot of a creator that stays, and reuses one that was freed', () => {
    const before = assignSlots({}, ['A', 'B', 'C']);
    const without = assignSlots(before, ['A', 'C']);
    expect(without).toEqual({ A: 0, C: 2 });
    expect(assignSlots(without, ['A', 'C', 'D'])).toEqual({ A: 0, C: 2, D: 1 });
  });
});

describe('names at the end of lines', () => {
  it('leaves labels that already have room where they are', () => {
    expect(spread([10, 40, 90], 15, 0, 200)).toEqual([10, 40, 90]);
  });

  it('pushes crowded labels apart in the same order', () => {
    const out = spread([50, 52, 51, 100], 15, 0, 200);
    expect(out[1]).toBeGreaterThan(out[2]);
    expect(out[0]).toBeLessThan(out[2]);
    const sorted = [...out].sort((a, b) => a - b);
    sorted.slice(1).forEach((y, i) => expect(y - sorted[i]).toBeGreaterThanOrEqual(15 - 1e-9));
  });

  it('keeps them inside the room there is', () => {
    const out = spread([190, 195, 199], 15, 0, 200);
    expect(Math.max(...out)).toBeLessThanOrEqual(200);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(0);
  });
});

describe('time axis', () => {
  it('puts a tick on the first of a month, every quarter when two years fill 800 pixels', () => {
    const { axis, label } = timeAxis(at('2024-10-01'), at('2026-10-01'), 0, 800);
    expect(axis.ticks.map(label)).toEqual([
      '2024-10',
      '2025-01',
      '2025-04',
      '2025-07',
      '2025-10',
      '2026-01',
      '2026-04',
      '2026-07',
      '2026-10',
    ]);
    expect(axis.at(at('2024-10-01'))).toBe(0);
    expect(axis.at(at('2026-10-01'))).toBe(800);
  });

  it('shows every month for one year over a wide chart', () => {
    const { axis } = timeAxis(at('2025-10-01'), at('2026-10-01'), 0, 1000);
    expect(axis.ticks).toHaveLength(13);
  });

  it('thins the ticks to whole years when the chart is narrow and the range long', () => {
    const { axis, label } = timeAxis(at('2022-11-30'), at('2026-10-01'), 0, 400);
    expect(axis.ticks.map(label)).toEqual(['2023', '2024', '2025', '2026']);
  });
});
