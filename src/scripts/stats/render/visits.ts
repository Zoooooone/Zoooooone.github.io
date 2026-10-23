import { h } from '../dom';
import {
  countryName,
  filterLabels,
  formatCount,
  formatDateTime,
  formatDuration,
  formatTime,
  languageName,
  navLabel,
  placeLabel,
  scrollLabel,
  shortId,
  sourceLabel,
  touchLabel,
  utmLabel,
  visitorName,
  visitorSummary,
  yesNo,
} from '../format';
import type { Filters, VisitRow } from '../types';
import { empty, filterButton } from './shared';

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

export function renderVisitorSummary(visitor: string, rows: VisitRow[]): HTMLElement[] {
  if (!rows.length) return [];
  const { visits, pages, first, last, totalMs } = visitorSummary(rows);
  return [
    h(
      'p',
      { class: 'stats-note mono-label' },
      `${visitorName(visitor)} · ID ${visitor}`,
      h('br'),
      `共 ${formatCount(visits)} 次访问，${formatCount(pages)} 个页面 · 首次 ${formatDateTime(first)} · 最近 ${formatDateTime(last)} · 累计停留 ${formatDuration(totalMs)}`,
    ),
  ];
}

function renderDetail(r: VisitRow): HTMLElement {
  const field = (label: string, value: string, code = false) =>
    h('div', {}, h('dt', {}, label), h('dd', code ? { class: 'code' } : {}, value || '—'));
  return h(
    'dl',
    { class: 'detail' },
    field('完整时间', formatDateTime(r.ts)),
    field('访客', visitorName(r.visitor_id)),
    field('访客 ID', r.visitor_id, true),
    field('页面', r.path),
    field('来源', r.referrer ? r.referrer : '直接访问'),
    field('来源参数', utmLabel(r)),
    field('进入方式', navLabel(r.nav)),
    field('国家或地区', r.country ? `${countryName(r.country)}（${r.country}）` : ''),
    field('省、州', r.region),
    field('城市', r.city),
    field('时区', r.tz),
    field('网络', r.as_org ? `${r.as_org}（AS${r.asn}）` : ''),
    field('浏览器', r.browser),
    field('系统', r.os),
    field('设备类型', r.device),
    field('屏幕', r.screen),
    field('窗口', r.viewport),
    field('像素密度', r.dpr),
    field('触屏', touchLabel(r.touch)),
    field('语言', r.lang ? `${languageName(r.lang)}（${r.lang}）` : ''),
    field('真实互动', yesNo(r.interacted)),
    field('滚动深度', scrollLabel(r.scroll_pct)),
    field('自动化标记', yesNo(r.automation)),
    field('爬虫标记', yesNo(r.is_bot)),
    field('停留', formatDuration(r.duration_ms)),
    h('div', { class: 'wide' }, h('dt', {}, '浏览器标识'), h('dd', { class: 'code' }, r.ua || '—')),
  );
}

export function renderVisits(rows: VisitRow[], now: number): HTMLElement {
  if (!rows.length) return empty('没有符合条件的访问');
  const sub = (text: string) => h('small', { class: 'sub' }, text);

  const columns = ['', '时间', '访客', '页面', '来源', '地区 · 网络', '设备 · 屏幕', '停留', '滚动', '互动'];
  const head = columns.map((t) => h('th', { scope: 'col' }, t));
  const body = rows.flatMap((r, i) => {
    const detailId = `visit-detail-${i}`;
    return [
      h(
        'tr',
        {},
        h(
          'td',
          { class: 'toggle' },
          h(
            'button',
            {
              type: 'button',
              class: 'expand',
              'data-toggle': detailId,
              'aria-expanded': 'false',
              'aria-controls': detailId,
              'aria-label': '展开这条访问的全部信息',
            },
            '▸',
          ),
        ),
        h('td', { class: 'mono' }, formatTime(r.ts, now)),
        h(
          'td',
          { class: 'mono' },
          filterButton('visitor', r.visitor_id, visitorName(r.visitor_id), `ID ${r.visitor_id}`),
          r.is_first ? h('span', { class: 'tag' }, 'NEW') : null,
          r.is_bot ? h('span', { class: 'tag bot' }, 'BOT') : null,
          r.automation ? h('span', { class: 'tag auto' }, 'AUTO') : null,
          h('small', { class: 'id' }, shortId(r.visitor_id)),
        ),
        h('td', { class: 'text' }, filterButton('path', r.path, r.path)),
        h('td', { class: 'text muted' }, sourceLabel(r.referrer)),
        h(
          'td',
          { class: 'text' },
          r.country ? filterButton('country', r.country, placeLabel(r)) : placeLabel(r),
          sub(r.as_org || '—'),
        ),
        h('td', { class: 'text muted' }, `${r.browser} · ${r.os}`, sub(`${r.device} · ${r.screen || '—'}`)),
        h('td', { class: 'mono' }, formatDuration(r.duration_ms)),
        h('td', { class: 'mono' }, scrollLabel(r.scroll_pct)),
        h('td', { class: 'mono' }, yesNo(r.interacted)),
      ),
      h(
        'tr',
        { class: 'detail-row', id: detailId, hidden: true },
        h('td', { colspan: columns.length }, renderDetail(r)),
      ),
    ];
  });

  return h('table', { class: 'visits' }, h('thead', {}, h('tr', {}, ...head)), h('tbody', {}, ...body));
}
