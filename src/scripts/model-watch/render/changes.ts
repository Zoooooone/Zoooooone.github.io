import { h } from '@/scripts/core/dom';
import { BOARD_LABELS, formatPrice, formatScore, type Metric } from '../metrics';
import { MEDIA_BOARDS, type Changes, type LlmChange } from '../types';
import { CHANGE_PAGE, changeList, empty, group, note, type ChangeItem } from './shared';

const signed = (n: number, digits = 1) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(digits)}`;
const tone = (n: number, higherIsBetter = true): ChangeItem['tone'] =>
  n === 0 ? undefined : n > 0 === higherIsBetter ? 'up' : 'down';
const score = (n: number | null | undefined) => (n == null ? '—' : formatScore(n));
const price = (n: number | null | undefined) => (n == null ? '无价格' : formatPrice(n));
const sub = (m: LlmChange) => [m.creator, m.release_date && `发布 ${m.release_date}`].filter(Boolean).join(' · ');

const title = (text: string) => h('h3', { class: 'section-title mono-label' }, text);

function llmSection(llm: NonNullable<Changes['llm']>, days: number, metric: Metric): HTMLElement {
  const shown = (n: number | null | undefined) => (n == null ? '—' : metric.format(n));
  return h(
    'div',
    { class: 'stack' },
    title('语言模型 · LLM'),
    note(
      llm.partial ? `还没有 ${days} 天前的快照，先与最早的 ${llm.from} 比较 → ${llm.to}` : `${llm.from} → ${llm.to}`,
    ),
    h(
      'div',
      { class: 'stats-split' },
      group(
        `新上榜 · ${llm.added.length}`,
        changeList(
          llm.added.map((m) => ({ label: m.name, sub: sub(m), value: `智能 ${score(m.now)}`, model: m.id })),
          '没有新模型',
          CHANGE_PAGE,
        ),
      ),
      group(
        `${metric.label}变动 · ${llm.rescored.length}`,
        changeList(
          llm.rescored.map((m) => {
            const gap = (m.now_metric ?? 0) - (m.was_metric ?? 0);
            const partial = m.was_metric == null || m.now_metric == null;
            return {
              label: m.name,
              sub: `${shown(m.was_metric)} → ${shown(m.now_metric)}`,
              value: partial
                ? m.now_metric == null
                  ? '数据移除'
                  : '新增数据'
                : `${gap > 0 ? '+' : '−'}${metric.format(Math.abs(gap))}`,
              tone: partial ? undefined : tone(gap, metric.better === 'high'),
              model: m.id,
            };
          }),
          `「${metric.label}」没有变化`,
          CHANGE_PAGE,
        ),
      ),
      group(
        `价格变动 · ${llm.repriced.length}`,
        changeList(
          llm.repriced.map((m) => {
            const was = m.was_price ?? null;
            const now = m.now_price ?? null;
            const share = was && now ? ((now - was) / was) * 100 : null;
            return {
              label: m.name,
              sub: `${price(was)} → ${price(now)}`,
              value: share == null ? (now == null ? '下架价格' : '新增价格') : `${signed(share, 0)}%`,
              tone: share == null ? undefined : tone(share, false),
              model: m.id,
            };
          }),
          '价格没有变化',
          CHANGE_PAGE,
        ),
      ),
      group(
        `下榜 · ${llm.removed.length}`,
        changeList(
          llm.removed.map((m) => ({ label: m.name, sub: sub(m), value: `智能 ${score(m.was)}` })),
          '没有模型下榜',
          CHANGE_PAGE,
        ),
      ),
    ),
  );
}

function arenaSection(changes: Changes): HTMLElement {
  return h(
    'div',
    { class: 'stack' },
    title('媒体竞技场 · ARENAS'),
    h(
      'div',
      { class: 'stats-split' },
      ...MEDIA_BOARDS.map((board) => {
        const c = changes.media[board];
        const heading = `${BOARD_LABELS[board]}${c ? ` · ${c.from} → ${c.to}` : ''}`;
        if (!c) return group(heading, empty('还没有两天的快照'));
        const items = [
          ...c.added.map((m) => ({
            label: m.name,
            sub: m.creator,
            value: `新上榜 #${m.now_rank ?? '—'}`,
            tone: 'up' as const,
          })),
          ...c.moved.map((m) => {
            const gap = (m.was_rank ?? 0) - (m.now_rank ?? 0);
            return {
              label: m.name,
              sub: `#${m.was_rank} → #${m.now_rank}`,
              value: `${gap > 0 ? '↑' : '↓'}${Math.abs(gap)}`,
              tone: tone(gap),
            };
          }),
          ...c.removed.map((m) => ({
            label: m.name,
            sub: m.creator,
            value: `下榜 · 原 #${m.was_rank ?? '—'}`,
            tone: 'down' as const,
          })),
        ];
        return group(heading, changeList(items, '排名没有变化', CHANGE_PAGE));
      }),
    ),
  );
}

export function renderChanges(changes: Changes, metric: Metric): HTMLElement {
  const hasMedia = MEDIA_BOARDS.some((b) => changes.media[b]);
  if (!changes.llm && !hasMedia) return empty('至少要有两天的快照才能比较，明天起开始显示变化');
  return h(
    'div',
    { class: 'stack' },
    ...(changes.llm ? [llmSection(changes.llm, changes.days, metric)] : []),
    arenaSection(changes),
  );
}
