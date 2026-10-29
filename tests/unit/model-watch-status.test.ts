import { describe, expect, it } from 'vitest';
import { staleness, statusLine, warnings } from '@/scripts/model-watch/status';
import type { Board, Latest } from '@/scripts/model-watch/types';

const snapshot = (days: Partial<Record<Board, string>>, runs: Latest['runs'] = []): Latest => ({
  boards: Object.entries(days).map(([board, day]) => ({ board: board as Board, day, fetched_at: 0, models: 1 })),
  runs,
  daily: [],
  index: null,
  llm: [],
  media: {},
});

// Tokyo is UTC+9, so these are 09:30 on 2026-10-26 and 05:00 on 2026-10-26.
const MORNING = Date.parse('2026-10-26T00:30:00Z');
const BEFORE_FETCH = Date.parse('2026-10-25T20:00:00Z');

describe('staleness', () => {
  it('says nothing about a snapshot from today', () => {
    expect(staleness(snapshot({ llm: '2026-10-26' }), MORNING)).toEqual([]);
  });

  it('waits until 8 in the morning before saying that yesterday’s snapshot is late', () => {
    const yesterday = snapshot({ llm: '2026-10-25' });
    expect(staleness(yesterday, BEFORE_FETCH)).toEqual([]);
    expect(staleness(yesterday, MORNING)).toEqual(['语言模型 今天的数据还没抓到（最新是 2026-10-25）']);
  });

  it('counts the days once two or more have passed, for each board', () => {
    const old = snapshot({ llm: '2026-10-23', 'text-to-image': '2026-10-24', 'text-to-video': '2026-10-26' });
    expect(staleness(old, MORNING)).toEqual([
      '语言模型 已经 3 天没有更新（最新是 2026-10-23）',
      '文生图 已经 2 天没有更新（最新是 2026-10-24）',
    ]);
  });

  it('leaves a board that already reports a failed fetch to that report', () => {
    const failed = snapshot({ llm: '2026-10-20' }, [{ board: 'llm', ts: 1, ok: 0, models: null, error: 'HTTP 500' }]);
    expect(staleness(failed, MORNING)).toEqual([]);
    expect(warnings(failed, MORNING)).toEqual(['语言模型 最近一次拉取失败：HTTP 500（显示的是 2026-10-20 的数据）']);
  });

  it('forgets a failure once a later fetch of that board worked', () => {
    const recovered = snapshot({ llm: '2026-10-26' }, [
      { board: 'llm', ts: 2, ok: 1, models: 5, error: '' },
      { board: 'llm', ts: 1, ok: 0, models: null, error: 'HTTP 500' },
    ]);
    expect(warnings(recovered, MORNING)).toEqual([]);
  });
});

describe('status line', () => {
  it('names the day of the LLM snapshot', () => {
    expect(statusLine(snapshot({ llm: '2026-10-26' }))).toMatch(/^DATA 2026-10-26 · FETCHED /);
  });

  it('points at the usual causes when nothing has been stored yet', () => {
    expect(statusLine(snapshot({}))).toContain('AA_API_KEY');
  });
});
