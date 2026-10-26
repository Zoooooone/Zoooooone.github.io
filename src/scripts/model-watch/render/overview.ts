import { h } from '@/scripts/core/dom';
import { daysBetween, isListed, rank } from '../data';
import { formatPrice, formatScore, formatSpeed } from '../metrics';
import type { Latest, LlmModel, MediaBoard } from '../types';

// "Near the top" for the value and speed picks: the cheapest or fastest model that is still within reach of the best.
const VALUE_SHARE = 0.9;
const SPEED_SHARE = 0.8;
const NEW_DAYS = 30;

const kpi = (label: string, value: string, sub: string) =>
  h(
    'div',
    { class: 'kpi frame cut-s' },
    h('span', { class: 'mono-label' }, label),
    h('b', {}, value),
    h('small', {}, sub),
  );

const best = <T>(list: T[], value: (item: T) => number | null, better: 'high' | 'low' = 'high') =>
  rank(list, value, better)[0];

type Leader<T> = { item: T; value: number } | undefined;

const leader = <T extends { name: string }>(label: string, found: Leader<T>, format: (n: number) => string) =>
  kpi(label, found ? format(found.value) : '—', found ? found.item.name : '还没有数据');

export function renderKpis(latest: Latest): HTMLElement[] {
  const all = latest.llm;
  const day = latest.boards.find((b) => b.board === 'llm')?.day ?? '';
  const listed = all.filter(isListed);
  const fresh = all.filter((m) => day && m.release_date && daysBetween(m.release_date, day) <= NEW_DAYS);
  const newest = best(fresh, (m) => Date.parse(m.release_date));
  const top = best(all, (m) => m.intelligence);
  const near = (share: number) => (m: LlmModel) => top != null && (m.intelligence ?? -1) >= top.value * share;
  const value = best(listed.filter(near(VALUE_SHARE)), (m) => m.price_blended, 'low');
  const fast = best(listed.filter(near(SPEED_SHARE)), (m) => m.tps);
  const arena = (board: MediaBoard, label: string) =>
    leader(
      label,
      best(latest.media[board] ?? [], (m) => m.elo),
      (n) => String(Math.round(n)),
    );

  return [
    kpi(
      'MODELS · 模型',
      String(all.length),
      `${new Set(all.map((m) => m.creator)).size} 家厂商 · ${listed.length} 个有价格`,
    ),
    kpi('NEW · 30 天新发布', String(fresh.length), newest ? `最新 ${newest.item.name}` : '这段时间没有新模型'),
    leader('TOP · 智能最高', top, formatScore),
    leader(
      'CODING · 编程最高',
      best(all, (m) => m.coding),
      formatScore,
    ),
    kpi(
      'VALUE · 前沿性价比',
      value ? formatPrice(value.value) : '—',
      value ? `${value.item.name} · 智能达到第一的 ${VALUE_SHARE * 100}%` : '没有符合条件的模型',
    ),
    kpi(
      'FAST · 前沿最快',
      fast ? formatSpeed(fast.value) : '—',
      fast ? `${fast.item.name} · 智能达到第一的 ${SPEED_SHARE * 100}%` : '没有符合条件的模型',
    ),
    arena('text-to-image', 'IMAGE · 文生图第一'),
    arena('text-to-video', 'VIDEO · 文生视频第一'),
  ];
}
