import { h } from '@/scripts/core/dom';
import { baseName, collapse, rank, variantOf } from '../data';
import type { Metric } from '../metrics';
import type { LlmModel } from '../types';
import { fromZero, LIST_PAGE, note, rankList } from './shared';

export function renderLeaderboard(models: LlmModel[], metric: Metric, merge: boolean): HTMLElement {
  const pool = merge ? collapse(models, metric.value, metric.better) : models;
  const ranked = rank(pool, metric.value, metric.better);
  const width = fromZero(
    ranked.map((r) => r.value),
    metric.better,
  );
  return h(
    'div',
    {},
    note(
      `${ranked.length} 个模型有「${metric.label}」数据 · ${metric.better === 'high' ? '越高越好' : '越低越好'}${
        merge ? ' · 每个模型只显示表现最好的档位' : ''
      }`,
    ),
    rankList(
      ranked.map(({ item, value }) => {
        const variant = variantOf(item.name);
        return {
          label: merge ? baseName(item.name) : item.name,
          sub: [item.creator, item.release_date, merge && variant ? `档位 ${variant}` : ''].filter(Boolean).join(' · '),
          value,
          valueText: metric.format(value),
          model: item.id,
        };
      }),
      width,
      '没有模型有这项数据',
      LIST_PAGE,
    ),
  );
}
