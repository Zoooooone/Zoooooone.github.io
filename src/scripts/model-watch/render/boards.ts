import { h } from '@/scripts/core/dom';
import { categoryName, creatorBoard, rank } from '../data';
import { formatScore } from '../metrics';
import type { LlmModel, MediaModel } from '../types';
import { fromRange, fromZero, LIST_PAGE, note, rankList } from './shared';

export function renderCreators(models: LlmModel[]): HTMLElement {
  const creators = creatorBoard(models);
  return h(
    'div',
    {},
    note(`${creators.length} 家厂商，按旗下最强模型的智能指数排序`),
    rankList(
      creators.map((c) => ({
        label: c.creator,
        sub: `最强 ${c.best.name} · ${c.models} 个模型 · 最近发布 ${c.latest || '—'}`,
        value: c.best.intelligence!,
        valueText: formatScore(c.best.intelligence!),
        tip: `${c.creator} · ${c.best.name}`,
      })),
      fromZero(
        creators.map((c) => c.best.intelligence!),
        'high',
      ),
      undefined,
      LIST_PAGE,
    ),
  );
}

export function categoriesOf(list: MediaModel[]): string[] {
  const counts = new Map<string, number>();
  for (const m of list)
    for (const c of m.categories) counts.set(categoryName(c), (counts.get(categoryName(c)) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([name]) => name)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
}

const confidence = (ci95: string | undefined) => {
  const match = /^-?(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(ci95 ?? '');
  return match ? (match[1] === match[2] ? `±${match[1]}` : `−${match[1]}/+${match[2]}`) : '';
};

export function renderMedia(list: MediaModel[], category: string): HTMLElement {
  const elo = (m: MediaModel) =>
    category ? (m.categories.find((c) => categoryName(c) === category)?.elo ?? null) : m.elo;
  const ranked = rank(list, elo, 'high');
  return h(
    'div',
    {},
    note(
      `${ranked.length} 个模型 · 按${category ? `「${category}」分类的` : ''} Elo 排序 · 只含对战次数够多、上了排行的模型`,
    ),
    rankList(
      ranked.map(({ item, value }) => {
        const cat = category ? item.categories.find((c) => categoryName(c) === category) : undefined;
        const ci = confidence(cat ? cat.ci95 : item.ci95);
        const appearances = cat ? cat.appearances : item.appearances;
        return {
          label: item.name,
          sub: [
            item.creator,
            item.release_date,
            ci && `置信区间 ${ci}`,
            appearances != null && `${appearances.toLocaleString('en-US')} 次对战`,
          ]
            .filter(Boolean)
            .join(' · '),
          value,
          valueText: String(Math.round(value)),
        };
      }),
      fromRange(ranked.map((r) => r.value)),
      list.length ? '这个分类还没有数据' : '这个竞技场还没有数据',
      LIST_PAGE,
    ),
  );
}
