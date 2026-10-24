import { h, svg } from '@/scripts/core/dom';
import { formatPrice, formatScore, type Metric } from '../metrics';
import type { History, LlmModel } from '../types';
import { note } from './shared';

function spark(values: (number | null)[], label: string, format: (n: number) => string): HTMLElement | null {
  const points = values.flatMap((v, i) => (v == null ? [] : [{ i, v }]));
  if (points.length < 2) return null;
  const min = Math.min(...points.map((p) => p.v));
  const max = Math.max(...points.map((p) => p.v));
  const y = (v: number) => (max === min ? 20 : 36 - ((v - min) / (max - min)) * 32);
  const x = (i: number) => (i / (values.length - 1)) * 100;
  return h(
    'div',
    { class: 'spark' },
    h('span', { class: 'mono-label' }, label),
    svg(
      'svg',
      { viewBox: '0 0 100 40', preserveAspectRatio: 'none', role: 'img', 'aria-label': `${label}的每日变化` },
      svg('polyline', { points: points.map((p) => `${x(p.i)},${y(p.v)}`).join(' ') }),
    ),
    h('small', {}, `${format(points[0].v)} → ${format(points[points.length - 1].v)}`),
  );
}

export function renderDetail(model: LlmModel, metrics: Metric[], history: History | null): HTMLElement {
  const groups = [...new Set(metrics.map((m) => m.group))];
  const days = history?.days ?? [];
  const sparks = [
    spark(
      days.map((d) => d.intelligence),
      '智能指数',
      formatScore,
    ),
    spark(
      days.map((d) => d.price_blended),
      '混合价格',
      formatPrice,
    ),
  ].filter((s): s is HTMLElement => s !== null);

  return h(
    'div',
    { class: 'model-detail' },
    h(
      'div',
      { class: 'detail-head' },
      h(
        'div',
        {},
        h('b', {}, model.name),
        h('small', {}, [model.creator, `发布 ${model.release_date || '—'}`].join(' · ')),
      ),
      h('button', { type: 'button', class: 'tool', 'data-close-detail': true }, '关闭'),
    ),
    ...groups.map((g) =>
      h(
        'dl',
        { class: 'detail' },
        h('div', { class: 'wide' }, h('dt', {}, g)),
        ...metrics
          .filter((m) => m.group === g)
          .map((m) => {
            const value = m.value(model);
            return h('div', {}, h('dt', {}, m.label), h('dd', {}, value == null ? '—' : m.format(value)));
          }),
      ),
    ),
    history === null
      ? note('正在读取历史…')
      : sparks.length
        ? h('div', { class: 'sparks' }, ...sparks)
        : note(`历史快照 ${days.length} 天，至少两天才画得出变化`),
  );
}
