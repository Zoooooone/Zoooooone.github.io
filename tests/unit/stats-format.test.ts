import { describe, expect, it } from 'vitest';
import {
  countryName,
  fillDays,
  filterLabels,
  formatCount,
  formatDateTime,
  formatDuration,
  formatTime,
  heatGrid,
  heatLevel,
  languageName,
  navLabel,
  percent,
  placeLabel,
  scrollLabel,
  shareOf,
  shortId,
  sourceLabel,
  tokyoDate,
  touchLabel,
  utmLabel,
  visitorName,
  visitorSummary,
  withOther,
  yesNo,
  NAME_COMBINATIONS,
} from '@/scripts/stats/format';

// 2026-10-21 12:39:04 UTC is 21:39:04 in Tokyo.
const TS = Date.UTC(2026, 9, 21, 12, 39, 4);

describe('Tokyo time', () => {
  it('moves the date forward when Tokyo is already on the next day', () => {
    expect(tokyoDate(Date.UTC(2026, 9, 21, 16, 0, 0))).toBe('2026-10-22');
    expect(tokyoDate(TS)).toBe('2026-10-21');
  });

  it('shows only the clock for today and the date for earlier days', () => {
    expect(formatTime(TS, TS + 60_000)).toBe('21:39:04');
    expect(formatTime(TS, TS + 24 * 60 * 60 * 1000)).toBe('10-21 21:39');
  });
});

describe('formatDuration', () => {
  it.each([
    [null, '—'],
    [0, '0s'],
    [1500, '2s'],
    [59_400, '59s'],
    [192_000, '3m 12s'],
    [3_660_000, '1h 01m'],
  ])('%s -> %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});

describe('small formatters', () => {
  it('groups thousands and shortens ids', () => {
    expect(formatCount(1234567)).toBe('1,234,567');
    expect(shortId('0123456789abcdef')).toBe('01234567');
  });

  it('names countries and falls back to the code', () => {
    expect(countryName('JP')).toBe('日本');
    expect(countryName('not-a-code')).toBe('not-a-code');
  });

  it('describes a place with whatever is known', () => {
    expect(placeLabel({ city: 'Tokyo', country: 'JP' })).toBe('Tokyo, JP');
    expect(placeLabel({ city: '', country: 'JP' })).toBe('JP');
    expect(placeLabel({ city: '', country: '' })).toBe('—');
  });

  it('describes where a visit came from', () => {
    expect(sourceLabel('')).toBe('直接访问');
    expect(sourceLabel('/posts/x/')).toBe('/posts/x/');
    expect(sourceLabel('https://www.google.com/search')).toBe('google.com/search');
    expect(sourceLabel('https://t.co/')).toBe('t.co');
    expect(sourceLabel('???')).toBe('—');
  });
});

describe('fillDays', () => {
  const daily = [
    { day: '2026-10-19', views: 3, visitors: 2 },
    { day: '2026-10-21', views: 1, visitors: 1 },
  ];

  it('adds empty bars for quiet days up to today', () => {
    expect(fillDays(daily, 4, '2026-10-21').map((d) => [d.day, d.views])).toEqual([
      ['2026-10-18', 0],
      ['2026-10-19', 3],
      ['2026-10-20', 0],
      ['2026-10-21', 1],
    ]);
  });

  it('starts at the first day with data for the whole history', () => {
    expect(fillDays(daily, 0, '2026-10-22').map((d) => d.day)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
    ]);
  });

  it('is just today when there is nothing', () => {
    expect(fillDays([], 0, '2026-10-21')).toEqual([{ day: '2026-10-21', views: 0, visitors: 0 }]);
  });
});

describe('heatmap', () => {
  it('lays counts out by weekday and hour and finds the busiest cell', () => {
    const { grid, max } = heatGrid([
      { dow: 0, hour: 0, views: 2 },
      { dow: 6, hour: 23, views: 9 },
    ]);
    expect(grid).toHaveLength(7);
    expect(grid[0]).toHaveLength(24);
    expect(grid[0][0]).toBe(2);
    expect(grid[6][23]).toBe(9);
    expect(max).toBe(9);
  });

  it('is empty without data', () => {
    expect(heatGrid([]).max).toBe(0);
  });

  it.each([
    [0, 8, 0],
    [1, 8, 1],
    [2, 8, 1],
    [3, 8, 2],
    [6, 8, 3],
    [8, 8, 4],
    [5, 0, 0],
  ])('level of %s out of %s is %s', (value, max, level) => {
    expect(heatLevel(value, max)).toBe(level);
  });
});

describe('visitorName', () => {
  // Ids shaped like the real ones (32 hex characters), from a fixed generator so the test never changes.
  const ids = (count: number) => {
    let state = 12345;
    return Array.from({ length: count }, () =>
      Array.from({ length: 32 }, () =>
        (((state = (state * 1103515245 + 12345) % 2147483648) >> 16) & 15).toString(16),
      ).join(''),
    );
  };

  it('is the same every time for the same id', () => {
    const id = 'a3f9c1d2e4b5a6978877665544332211';
    expect(visitorName(id)).toBe(visitorName(id));
  });

  it('is a two-character word and two digits', () => {
    for (const id of ids(200)) expect(visitorName(id)).toMatch(/^\D{2}\d{2}$/);
  });

  it('has room for over ten thousand different names', () => {
    expect(NAME_COMBINATIONS).toBeGreaterThan(10_000);
  });

  it('repeats about as often as chance allows among a few hundred visitors', () => {
    // 300 visitors over 12,800 names repeat about 4 times on average; far more would mean the id is not spread out.
    const names = ids(300).map(visitorName);
    expect(300 - new Set(names).size).toBeLessThanOrEqual(10);
  });
});

describe('filterLabels', () => {
  it('names the visitor and keeps the start of the id', () => {
    const [label] = filterLabels({ visitor: 'a3f9c1d2e4b5a6978877665544332211' });
    expect(label.text).toBe(`访客 ${visitorName('a3f9c1d2e4b5a6978877665544332211')} · a3f9c1d2`);
  });

  it('lists the active filters in a fixed order', () => {
    expect(
      filterLabels({ first: true, country: 'JP', path: '/a/', visitor: 'abcdef0123456789' }).map((f) => f.key),
    ).toEqual(['visitor', 'path', 'country', 'first']);
  });

  it('is empty without filters', () => {
    expect(filterLabels({})).toEqual([]);
  });
});

describe('labels for the browser signals', () => {
  it('shows a share of what was measured, or a dash when nothing was', () => {
    expect(percent({ measured: 0, yes: 0 })).toBe('—');
    expect(percent({ measured: 4, yes: 1 })).toBe('25%');
    expect(percent({ measured: 3, yes: 1 })).toBe('33%');
    expect(percent({ measured: 3, yes: 3 })).toBe('100%');
  });

  it('keeps unknown apart from no', () => {
    expect(yesNo(null)).toBe('—');
    expect(yesNo(true)).toBe('是');
    expect(yesNo(false)).toBe('否');
  });

  it('writes scroll depth and touch points', () => {
    expect(scrollLabel(null)).toBe('—');
    expect(scrollLabel(80)).toBe('80%');
    expect(touchLabel(null)).toBe('—');
    expect(touchLabel(0)).toBe('否');
    expect(touchLabel(5)).toBe('是（5 点）');
  });

  it('names how a page was opened', () => {
    expect(navLabel('spa')).toBe('站内跳转');
    expect(navLabel('reload')).toBe('刷新');
    expect(navLabel('')).toBe('—');
    expect(navLabel('something-new')).toBe('something-new');
  });

  it('joins the campaign tags that are there', () => {
    expect(utmLabel({ utm_source: 'chatgpt.com', utm_medium: 'referral', utm_campaign: '' })).toBe(
      'chatgpt.com / referral',
    );
    expect(utmLabel({ utm_source: '', utm_medium: '', utm_campaign: '' })).toBe('—');
  });

  it('names a language and falls back to the code', () => {
    expect(languageName('zh-CN')).toContain('中文');
    expect(languageName('')).toBe('—');
    expect(languageName('not a code!')).toBe('not a code!');
  });

  it('writes the full time in Tokyo time', () => {
    expect(formatDateTime(TS)).toBe('2026-10-21 21:39:04（东京时间）');
  });
});

describe('visitorSummary', () => {
  it('adds up the visits that are loaded', () => {
    const rows = [
      { ts: 3000, path: '/a/', duration_ms: 1000 },
      { ts: 1000, path: '/b/', duration_ms: null },
      { ts: 2000, path: '/a/', duration_ms: 500 },
    ];
    expect(visitorSummary(rows)).toEqual({ visits: 3, pages: 2, first: 1000, last: 3000, totalMs: 1500 });
  });
});

describe('shareOf', () => {
  it('rounds to a whole percent', () => {
    expect(shareOf(1, 3)).toBe('33%');
    expect(shareOf(2, 3)).toBe('67%');
    expect(shareOf(5, 5)).toBe('100%');
    expect(shareOf(0, 5)).toBe('0%');
  });

  it('says less than 1% instead of showing a rounded zero for something that happened', () => {
    expect(shareOf(1, 1000)).toBe('<1%');
  });

  it('is a dash when there is nothing to compare with', () => {
    expect(shareOf(0, 0)).toBe('—');
  });
});

describe('withOther', () => {
  const list = [
    { name: 'a', views: 50 },
    { name: 'b', views: 30 },
    { name: 'c', views: 10 },
    { name: 'd', views: 5 },
  ];

  it('keeps the first entries and adds up the rest, so the shares cover the whole', () => {
    const items = withOther(list, 2, 100);
    expect(items.map((i) => [i.name, i.views])).toEqual([
      ['a', 50],
      ['b', 30],
      ['其他', 20],
    ]);
    expect(items.reduce((sum, i) => sum + i.views, 0)).toBe(100);
    expect(items.map((i) => i.other)).toEqual([false, false, true]);
  });

  it('counts what the list did not include at all as other', () => {
    expect(withOther(list, 10, 120).at(-1)).toEqual({ name: '其他', views: 25, other: true });
  });

  it('adds nothing when the entries already cover the whole', () => {
    expect(withOther(list.slice(0, 2), 5, 80)).toHaveLength(2);
  });

  it('is empty when there is nothing', () => {
    expect(withOther([], 5, 0)).toEqual([]);
  });
});
