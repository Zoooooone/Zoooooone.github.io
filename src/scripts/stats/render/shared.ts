import { h } from '@/scripts/core/dom';
import type { Filters } from '../types';

export const empty = (text = '这段时间没有数据') => h('p', { class: 'stats-empty' }, text);

export const NOT_MEASURED = '新增的信号，只覆盖开始采集之后的访问';

export const group = (title: string, content: HTMLElement) =>
  h('div', {}, h('h3', { class: 'mono-label' }, title), content);

export const filterButton = (
  key: keyof Filters,
  value: string,
  label: string | (string | HTMLElement)[],
  tip?: string,
) =>
  h(
    'button',
    { type: 'button', class: 'link', 'data-filter': key, 'data-value': value, 'data-tip': tip },
    ...[label].flat(),
  );
