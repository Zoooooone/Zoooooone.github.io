import { h, svg } from './dom';
import {
  WEEKDAYS,
  countryName,
  fillDays,
  filterLabels,
  formatCount,
  formatDuration,
  formatTime,
  heatGrid,
  heatLevel,
  placeLabel,
  shortId,
  sourceLabel,
  tokyoDate,
  visitorName,
} from './format';
import type { Filters, Named, Summary, VisitRow } from './types';

const empty = (text = '这段时间没有数据') => h('p', { class: 'stats-empty' }, text);

export function renderKpis(totals: Summary['totals']): HTMLElement[] {
  const kpi = (label: string, value: string, sub: string) =>
    h(
      'div',
      { class: 'kpi frame cut-s' },
      h('span', { class: 'mono-label' }, label),
      h('b', {}, value),
      h('small', {}, sub),
    );
  return [
    kpi('VIEWS · 访问', formatCount(totals.views), '页面浏览次数'),
    kpi('VISITORS · 访客', formatCount(totals.visitors), '按浏览器区分'),
    kpi('NEW · 新访客', formatCount(totals.newVisitors), `回访 ${formatCount(totals.returningVisitors)}`),
    kpi('TIME · 平均停留', formatDuration(totals.avgDurationMs), '仅统计有记录的页面'),
  ];
}

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

interface RankItem {
  label: string;
  value: number;
  sub?: string;
  filter?: { key: keyof Filters; value: string };
}

function renderRank(items: RankItem[]): HTMLElement {
  if (!items.length) return empty();
  const max = Math.max(...items.map((i) => i.value));
  return h(
    'ol',
    { class: 'rank' },
    ...items.map((item) =>
      h(
        'li',
        { style: `--w:${(item.value / max) * 100}%` },
        h(
          'span',
          { class: 'rank-label' },
          item.filter
            ? h(
                'button',
                { type: 'button', class: 'link', 'data-filter': item.filter.key, 'data-value': item.filter.value },
                item.label,
              )
            : item.label,
          item.sub ? h('small', {}, item.sub) : null,
        ),
        h('span', { class: 'rank-bar', 'aria-hidden': 'true' }),
        h('span', { class: 'rank-num' }, formatCount(item.value)),
      ),
    ),
  );
}

export function renderPages(pages: Summary['pages']): HTMLElement {
  return renderRank(
    pages.map((p) => ({
      label: p.path,
      value: p.views,
      sub: `${formatCount(p.visitors)} 位访客 · ${formatDuration(p.avg_ms)}`,
      filter: { key: 'path', value: p.path },
    })),
  );
}

export function renderSources(referrers: Summary['referrers']): HTMLElement {
  return h(
    'div',
    {},
    referrers.external.length
      ? renderRank(referrers.external.map((r) => ({ label: r.host, value: r.views })))
      : empty('暂无外站来源'),
    h(
      'p',
      { class: 'stats-note mono-label' },
      `直接访问 ${formatCount(referrers.direct)} · 站内跳转 ${formatCount(referrers.internal)}`,
    ),
  );
}

const named = (list: Named[]) => renderRank(list.map((n) => ({ label: n.name, value: n.views })));

export function renderPlaces(summary: Summary): HTMLElement {
  return h(
    'div',
    { class: 'stats-split' },
    h(
      'div',
      {},
      h('h3', { class: 'mono-label' }, '国家与地区'),
      renderRank(
        summary.countries.map((c) => ({
          label: countryName(c.name),
          value: c.views,
          sub: c.name,
          filter: { key: 'country', value: c.name },
        })),
      ),
    ),
    h(
      'div',
      {},
      h('h3', { class: 'mono-label' }, '城市'),
      renderRank(summary.cities.map((c) => ({ label: c.city, value: c.views, sub: c.country }))),
    ),
  );
}

export function renderDevices(summary: Summary): HTMLElement {
  const group = (title: string, list: Named[]) => h('div', {}, h('h3', { class: 'mono-label' }, title), named(list));
  return h(
    'div',
    { class: 'stats-split three' },
    group('设备', summary.devices),
    group('浏览器', summary.browsers),
    group('系统', summary.systems),
  );
}

export function renderFilters(filters: Filters): HTMLElement[] {
  return filterLabels(filters).map(({ key, text }) =>
    h(
      'span',
      { class: 'chip' },
      text,
      h('button', { type: 'button', 'data-clear': key, 'aria-label': `移除筛选：${text}` }, '×'),
    ),
  );
}

export function renderVisits(rows: VisitRow[], now: number): HTMLElement {
  if (!rows.length) return empty('没有符合条件的访问');
  const link = (filter: keyof Filters, value: string, text: string, tip?: string) =>
    h('button', { type: 'button', class: 'link', 'data-filter': filter, 'data-value': value, 'data-tip': tip }, text);

  const head = ['时间', '访客', '页面', '来源', '地区', '设备', '停留'].map((t) => h('th', { scope: 'col' }, t));
  const body = rows.map((r) =>
    h(
      'tr',
      {},
      h('td', { class: 'mono' }, formatTime(r.ts, now)),
      h(
        'td',
        { class: 'mono' },
        link('visitor', r.visitor_id, visitorName(r.visitor_id), `ID ${shortId(r.visitor_id)}`),
        r.is_first ? h('span', { class: 'tag' }, 'NEW') : null,
        r.is_bot ? h('span', { class: 'tag bot' }, 'BOT') : null,
      ),
      h('td', {}, link('path', r.path, r.path)),
      h('td', { class: 'muted' }, sourceLabel(r.referrer)),
      h('td', {}, r.country ? link('country', r.country, placeLabel(r)) : placeLabel(r)),
      h('td', { class: 'muted' }, `${r.browser} · ${r.os} · ${r.device}`),
      h('td', { class: 'mono' }, formatDuration(r.duration_ms)),
    ),
  );

  return h('table', { class: 'visits' }, h('thead', {}, h('tr', {}, ...head)), h('tbody', {}, ...body));
}
