import { h } from '@/scripts/core/dom';
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

const modelButton = (id: string, label: string) =>
  h('button', { type: 'button', class: 'link', 'data-model': id, 'aria-expanded': 'false' }, label);

export function rankList(rows: Row[], width: (value: number) => number, emptyText?: string): HTMLElement {
  if (!rows.length) return empty(emptyText);
  return h(
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
}

export interface ChangeItem {
  label: string;
  sub?: string;
  value: string;
  tone?: 'up' | 'down';
  model?: string;
}

export function changeList(items: ChangeItem[], emptyText: string): HTMLElement {
  if (!items.length) return empty(emptyText);
  return h(
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
}

/** Fills a `<select>` with one option per metric, grouped, and selects the one with `key`. */
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
