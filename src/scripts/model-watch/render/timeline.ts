import { h, svg } from '@/scripts/core/dom';
import { leadingCreators, releasesOf, type Release } from '../data';
import type { Metric } from '../metrics';
import {
  DAY,
  latestDay,
  milestones,
  spread,
  stepsBetween,
  windowStart,
  WINDOWS,
  type Series,
  type WindowKey,
} from '../timeline-data';
import type { LlmModel } from '../types';
import { panel, type ChartState } from './charts';
import { drawLabels, drawMarks, type Mark } from './marks';
import { geometry, linearAxis, plot, timeAxis } from './plot';
import { changeList, empty, group, note } from './shared';

const HUES = [255, 40, 135, 330, 200, 85, 295, 15];
const NAME_MARGIN = 124;
const NAME_LENGTH = 14;
const NAME_GAP = 15;
const SWITCHES = 14;
const DETAIL_LABELS = 10;
const MILESTONES = 6;

export interface TimelineOptions {
  metric: Metric;
  creators: string[];
  slots: Record<string, number>;
  window: WindowKey;
  width: number;
  state: ChartState;
}

const dateOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const shorten = (name: string) => (name.length > NAME_LENGTH ? `${name.slice(0, NAME_LENGTH - 1)}…` : name);

export function renderTimeline(models: LlmModel[], options: TimelineOptions): HTMLElement {
  const { metric, creators, slots } = options;
  const series: Series[] = creators
    .map((creator) => ({ creator, releases: releasesOf(models, creator, metric.value) }))
    .filter((s) => s.releases.length);
  if (!series.length) return empty(`选中的厂商没有带发布日期和「${metric.label}」的模型`);

  const now = latestDay(models);
  const first = Math.min(...series.map((s) => s.releases[0].day));
  const start = windowStart(options.window, first, now);
  const single = series.length === 1;
  const steps = series.map((s) => stepsBetween(s.releases, start, now));

  const geo = geometry(options.width, { right: NAME_MARGIN });
  const right = geo.w - geo.pad.right;
  const { axis: x, label: xLabel } = timeAxis(start, now + 10 * DAY, geo.pad.left, right);
  const hueOf = (creator: string) => HUES[(slots[creator] ?? 0) % HUES.length];
  const switches = [...new Set([...leadingCreators(models, metric.value).slice(0, SWITCHES), ...creators])];

  const draw = (state: ChartState): HTMLElement[] => {
    const focus = series.some((s) => s.creator === state.creator) ? state.creator : '';

    // The scale fits the lines, and every release of the one creator shown in full, so none falls off the bottom.
    const inRange = (r: Release) => r.day >= start && r.day <= now;
    const shown = series.filter((s) => single || s.creator === focus);
    const reached = [
      ...steps.flatMap((st) => st.map((p) => p.value)),
      ...shown.flatMap((s) => s.releases.filter(inRange).map((r) => r.value)),
    ];
    const y = linearAxis(Math.min(...reached), Math.max(...reached), geo.h - geo.pad.bottom, geo.pad.top);
    const ends = steps.map((st) => y.at(st[st.length - 1].value));
    const nameY = spread(ends, NAME_GAP, geo.pad.top + 6, geo.h - geo.pad.bottom - 2);

    const lines = series.map((s, i) => {
      const corners = steps[i].flatMap((p, k) =>
        k
          ? [
              [x.at(p.day), y.at(steps[i][k - 1].value)],
              [x.at(p.day), y.at(p.value)],
            ]
          : [[x.at(p.day), y.at(p.value)]],
      );
      corners.push([right, ends[i]]);
      return svg(
        'g',
        { class: focus && focus !== s.creator ? 'series dim' : 'series', style: `--h:${hueOf(s.creator)}` },
        svg('polyline', { class: 'series-line', points: corners.map((c) => c.join(',')).join(' ') }),
        svg('line', { class: 'series-link', x1: right, y1: ends[i], x2: right + 8, y2: nameY[i] - 4 }),
        svg('text', { class: 'series-end', x: right + 10, y: nameY[i], 'data-creator': s.creator }, shorten(s.creator)),
      );
    });

    const marks = series.flatMap((s): Mark[] => {
      const detailed = single || s.creator === focus;
      return s.releases
        .filter((r) => inRange(r) && (detailed || r.record))
        .map((r) => ({
          x: x.at(r.day),
          y: y.at(r.value),
          id: r.model.id,
          name: r.model.name,
          line: `${s.creator} · ${r.model.release_date} · ${metric.format(r.value)}${r.record ? ' · 该公司新高' : ''}`,
          // Later releases weigh more; the scale stays under 100 so it never outranks a kind.
          weight: ((r.day - start) / (now - start || 1)) * 100,
          kind: r.model.id === state.pinned ? 'pinned' : r.record ? 'best' : 'plain',
          dim: focus !== '' && s.creator !== focus,
          label: detailed && r.record,
          hue: hueOf(s.creator),
        }));
    });

    return [
      h(
        'div',
        { class: 'timeline-bar' },
        h(
          'div',
          { class: 'creators', role: 'group', 'aria-label': '选择厂商' },
          h('span', { class: 'mono-label' }, '厂商'),
          ...switches.map((creator) =>
            h(
              'button',
              {
                type: 'button',
                class: 'pick-chip',
                'data-lane': creator,
                'aria-pressed': String(creators.includes(creator)),
              },
              creators.includes(creator) ? h('i', { class: 'swatch-dot', style: `--h:${hueOf(creator)}` }) : null,
              creator,
            ),
          ),
        ),
        h(
          'div',
          { class: 'seg', role: 'group', 'aria-label': '时间范围' },
          ...WINDOWS.map((w) =>
            h(
              'button',
              { type: 'button', 'data-window': w.key, 'aria-pressed': String(w.key === options.window) },
              w.label,
            ),
          ),
        ),
      ),
      plot(
        geo,
        {
          label: `${series.length} 家厂商的「${metric.label}」随发布时间的变化`,
          x,
          y,
          titles: { x: '发布时间', y: metric.label },
          format: { x: xLabel, y: metric.format },
        },
        [...lines, ...drawMarks(marks), ...drawLabels(geo, marks, single || focus ? DETAIL_LABELS : 0)],
      ),
    ];
  };

  const everyValue = series.flatMap((s) => s.releases.map((r) => r.value));
  const lo = Math.min(...everyValue);
  const hi = Math.max(...everyValue);
  const thresholds = linearAxis(lo, hi, 0, 1)
    .ticks.filter((t) => t > lo && t <= hi)
    .slice(-MILESTONES);
  const firstToReach = milestones(series, thresholds).map((m) => {
    const [leader, ...rest] = m.reached;
    return {
      label: `≥ ${metric.format(m.threshold)}`,
      sub:
        [
          ...rest.map((r) => `${r.creator} +${Math.round((r.day - leader.day) / DAY)} 天`),
          m.missing.length ? `未达到：${m.missing.join('、')}` : '',
        ]
          .filter(Boolean)
          .join(' · ') || '只有这一家达到',
      value: `${leader.creator} · ${dateOf(leader.day)}`,
    };
  });

  const strongest = series
    .map((s) => s.releases.reduce((a, b) => (b.value >= a.value ? b : a)))
    .sort((a, b) => b.value - a.value);

  return panel(
    'timeline',
    options.state,
    draw,
    note(
      single
        ? `只选了一家：显示它在这段时间里的每一次发布，实心点是新高，点越高「${metric.label}」越高 · 悬停看名字，点击展开详情 · 含已下线的模型`
        : `每条线是一家公司历史上达到过的最高「${metric.label}」，实心点是刷新纪录的那次发布 · 点线端的名字聚焦一家，看它的每次发布 · 悬停看名字，点击展开详情 · 含已下线的模型`,
    ),
    single
      ? null
      : h(
          'div',
          { 'data-milestones': '' },
          group('最先达到各分数线的公司（按全部历史，不受时间范围影响）', changeList(firstToReach, '没有数据')),
        ),
    group(
      '各公司当前最强',
      changeList(
        strongest.map((r) => ({
          label: r.model.name,
          sub: `${r.model.creator} · ${r.model.release_date}`,
          value: metric.format(r.value),
          model: r.model.id,
        })),
        '没有数据',
      ),
    ),
  );
}
