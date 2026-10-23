import { h, svg } from '../dom';
import { WEEKDAYS, fillDays, formatCount, heatGrid, heatLevel, shareOf, tokyoDate, withOther } from '../format';
import type { Named, Summary } from '../types';
import { empty } from './shared';

export function renderDaily(summary: Summary, now: number): HTMLElement {
  const points = fillDays(summary.daily, summary.days, tokyoDate(now));
  const max = Math.max(1, ...points.map((p) => p.views));
  if (!points.some((p) => p.views > 0)) return empty();

  const chart = svg('svg', {
    viewBox: `0 0 ${points.length} 100`,
    preserveAspectRatio: 'none',
    role: 'img',
    'aria-label': `每日访问趋势，${points[0].day} 至 ${points[points.length - 1].day}，最高 ${max} 次`,
  });
  points.forEach((p, i) => {
    const viewsHeight = (p.views / max) * 100;
    const visitorsHeight = (p.visitors / max) * 100;
    chart.append(
      svg(
        'g',
        {},
        svg('rect', { class: 'bar-views', x: i + 0.12, y: 100 - viewsHeight, width: 0.76, height: viewsHeight }),
        svg('rect', {
          class: 'bar-visitors',
          x: i + 0.28,
          y: 100 - visitorsHeight,
          width: 0.44,
          height: visitorsHeight,
        }),
        // Covers the whole column, so a thin or empty bar is still easy to point at.
        svg('rect', {
          class: 'hit',
          x: i,
          y: 0,
          width: 1,
          height: 100,
          'data-tip': `${p.day} · ${p.views} 次访问 · ${p.visitors} 位访客`,
        }),
      ),
    );
  });

  return h(
    'div',
    { class: 'chart' },
    h('div', { class: 'chart-scale mono-label' }, h('span', {}, `MAX ${formatCount(max)}`)),
    chart,
    h(
      'div',
      { class: 'chart-axis mono-label' },
      h('span', {}, points[0].day),
      h('span', {}, points[points.length - 1].day),
    ),
    h(
      'p',
      { class: 'legend mono-label' },
      h('i', { class: 'swatch views' }),
      '访问',
      h('i', { class: 'swatch visitors' }),
      '访客',
    ),
  );
}

export function renderHeatmap(cells: Summary['heatmap']): HTMLElement {
  const { grid, max } = heatGrid(cells);
  if (max === 0) return empty();

  const head = h('tr', {}, h('td', {}));
  for (let hour = 0; hour < 24; hour++) {
    head.append(
      h('th', { scope: 'col', 'aria-label': `${hour} 点` }, hour % 3 === 0 ? String(hour).padStart(2, '0') : ''),
    );
  }
  const body = grid.map((row, dow) => {
    const tr = h('tr', {}, h('th', { scope: 'row' }, `周${WEEKDAYS[dow]}`));
    row.forEach((views, hour) => {
      tr.append(
        h(
          'td',
          {
            'data-level': heatLevel(views, max),
            'data-tip': `周${WEEKDAYS[dow]} ${String(hour).padStart(2, '0')}:00 · ${views} 次访问`,
          },
          h('span', { class: 'sr' }, `周${WEEKDAYS[dow]} ${hour} 点，${views} 次访问`),
        ),
      );
    });
    return tr;
  });

  return h(
    'table',
    { class: 'heat' },
    h('caption', { class: 'sr' }, '按星期和小时统计的访问次数，东京时间'),
    h('thead', {}, head),
    h('tbody', {}, ...body),
  );
}

export function renderColumns(
  labels: string[],
  counts: { bucket: number; views: number }[],
  emptyText: string,
  ticks = labels,
): HTMLElement {
  const values = labels.map((_, bucket) => counts.find((c) => c.bucket === bucket)?.views ?? 0);
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total === 0) return empty(emptyText);
  const max = Math.max(...values);
  return h(
    'ol',
    { class: 'columns' },
    ...labels.map((label, i) =>
      h(
        'li',
        { 'data-tip': `${label} · ${formatCount(values[i])} 次访问 · ${shareOf(values[i], total)}` },
        h(
          'span',
          { class: 'col-track' },
          h('i', { class: 'col-bar', style: `height:${(values[i] / max) * 100}%` }),
          h('span', { class: 'col-value', style: `bottom:${(values[i] / max) * 100}%` }, shareOf(values[i], total)),
        ),
        h('span', { class: 'col-label' }, ticks[i]),
      ),
    ),
  );
}

export function renderShare(title: string, list: Named[], total: number): HTMLElement {
  const items = withOther(list, 5, total);
  const kind = (item: { other: boolean }, i: number) => (item.other ? 'other' : `s${i}`);
  const tip = (item: { name: string; views: number }) =>
    `${item.name} · ${formatCount(item.views)} 次访问 · ${shareOf(item.views, total)}`;
  return h(
    'div',
    { class: 'share' },
    h('h3', { class: 'mono-label' }, title),
    items.length
      ? h(
          'div',
          {},
          h(
            'div',
            { class: 'share-bar', 'aria-hidden': 'true' },
            ...items.map((item, i) =>
              h('i', { class: `slice ${kind(item, i)}`, style: `flex-grow:${item.views}`, 'data-tip': tip(item) }),
            ),
          ),
          h(
            'ul',
            { class: 'share-legend' },
            ...items.map((item, i) =>
              h(
                'li',
                { 'data-tip': tip(item) },
                h('i', { class: `swatch ${kind(item, i)}` }),
                item.name,
                h('b', {}, shareOf(item.views, total)),
              ),
            ),
          ),
        )
      : empty(),
  );
}
