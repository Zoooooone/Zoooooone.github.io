import { h, svg } from '@/scripts/core/dom';
import type { Metric } from '../metrics';

export const empty = (text = '没有数据') => h('p', { class: 'stats-empty' }, text);

export const note = (text: string) => h('p', { class: 'stats-note mono-label' }, text);

export const group = (title: string, content: HTMLElement) =>
  h('div', {}, h('h3', { class: 'mono-label' }, title), content);

export interface Row {
  label: string;
  sub?: string;
  value: number;
  valueText: string;
  tip?: string;
  model?: string;
}

/** Bar length as a share of the best value; a lower value wins for prices and delays. */
export function fromZero(values: number[], better: 'high' | 'low'): (value: number) => number {
  const max = Math.max(...values);
  const min = Math.min(...values);
  return better === 'high' ? (v) => (max > 0 ? v / max : 0) : (v) => (v > 0 ? min / v : 0);
}

// Arena scores sit close together (1000 to 1350), so bars measured from zero would all look full.
export function fromRange(values: number[]): (value: number) => number {
  const max = Math.max(...values);
  const min = Math.min(...values);
  return (v) => (max === min ? 1 : 0.08 + (0.92 * (v - min)) / (max - min));
}

export const LIST_PAGE = 10;
export const CHANGE_PAGE = 5;

const icon = (...paths: string[]) =>
  svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, ...paths.map((d) => svg('path', { d })));

const turn = (to: 'first' | 'prev' | 'next' | 'last', label: string, ...paths: string[]) =>
  h(
    'button',
    { type: 'button', class: 'tool paging-btn', 'data-turn': to, 'aria-label': label, title: label },
    icon(...paths),
  );

function paged(list: HTMLElement, size: number): HTMLElement {
  if (list.children.length <= size) return list;
  const paging = h(
    'nav',
    { class: 'paging', 'aria-label': '翻页', 'data-size': size },
    turn('first', '首页', 'm11 17-5-5 5-5', 'm18 17-5-5 5-5'),
    turn('prev', '上一页', 'm15 18-6-6 6-6'),
    h('span', { class: 'paging-page', role: 'status' }),
    turn('next', '下一页', 'm9 18 6-6-6-6'),
    turn('last', '末页', 'm6 17 5-5-5-5', 'm13 17 5-5-5-5'),
  );
  const wrap = h('div', { class: 'paged' }, list, paging);
  showPage(paging, 0);
  return wrap;
}

function showPage(paging: HTMLElement, page: number) {
  const size = Number(paging.dataset.size);
  const items = ([...paging.previousElementSibling!.children] as HTMLElement[]).filter(
    (item) => !item.classList.contains('detail-row'),
  );
  const last = Math.ceil(items.length / size) - 1;
  const now = Math.min(Math.max(page, 0), last);
  items.forEach((item, i) => (item.hidden = Math.floor(i / size) !== now));
  paging.dataset.page = String(now);
  paging.querySelector('.paging-page')!.textContent = `${now + 1} / ${last + 1}`;
  paging.querySelectorAll<HTMLButtonElement>('[data-turn]').forEach((button) => {
    button.disabled = ['first', 'prev'].includes(button.dataset.turn!) ? now === 0 : now === last;
  });
}

export function turnPage(button: HTMLElement) {
  const paging = button.closest<HTMLElement>('.paging')!;
  const page = Number(paging.dataset.page);
  const target = { first: 0, prev: page - 1, next: page + 1, last: Infinity }[button.dataset.turn as 'first'];
  showPage(paging, target);
}

const modelButton = (id: string, label: string) =>
  h('button', { type: 'button', class: 'link', 'data-model': id, 'aria-expanded': 'false' }, label);

export function rankList(
  rows: Row[],
  width: (value: number) => number,
  emptyText?: string,
  pageSize?: number,
): HTMLElement {
  if (!rows.length) return empty(emptyText);
  const list = h(
    'ol',
    { class: 'rank' },
    ...rows.map((row, i) =>
      h(
        'li',
        { style: `--w:${Math.max(0, Math.min(1, width(row.value))) * 100}%`, 'data-tip': row.tip },
        h(
          'span',
          { class: 'rank-label' },
          h(
            'span',
            { class: 'rank-name' },
            h('span', { class: 'pos' }, String(i + 1).padStart(2, '0')),
            row.model ? modelButton(row.model, row.label) : row.label,
          ),
          row.sub ? h('small', {}, row.sub) : null,
        ),
        h('span', { class: 'rank-bar', 'aria-hidden': 'true' }),
        h('span', { class: 'rank-num' }, row.valueText),
      ),
    ),
  );
  return pageSize ? paged(list, pageSize) : list;
}

export interface ChangeItem {
  label: string;
  sub?: string;
  value: string;
  tone?: 'up' | 'down';
  model?: string;
}

export function changeList(items: ChangeItem[], emptyText: string, pageSize?: number): HTMLElement {
  if (!items.length) return empty(emptyText);
  const list = h(
    'ul',
    { class: 'changes' },
    ...items.map((item) =>
      h(
        'li',
        {},
        h(
          'span',
          { class: 'rank-label' },
          item.model ? modelButton(item.model, item.label) : h('span', {}, item.label),
          item.sub ? h('small', {}, item.sub) : null,
        ),
        h('span', { class: item.tone ? `delta ${item.tone}` : 'delta' }, item.value),
      ),
    ),
  );
  return pageSize ? paged(list, pageSize) : list;
}

export function fillSelect(select: HTMLSelectElement, metrics: Metric[], key: string) {
  const groups = [...new Set(metrics.map((m) => m.group))];
  select.replaceChildren(
    ...groups.map((g) =>
      h(
        'optgroup',
        { label: g },
        ...metrics
          .filter((m) => m.group === g)
          .map((m) => h('option', { value: m.key, selected: m.key === key }, m.label)),
      ),
    ),
  );
}
