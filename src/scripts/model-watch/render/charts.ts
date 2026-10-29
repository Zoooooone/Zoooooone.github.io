import { h, svg } from '@/scripts/core/dom';
import { pareto, stairs, type MonthBest } from '../data';
import { formatScore, type Metric } from '../metrics';
import type { Latest, LlmModel } from '../types';
import { drawLabels, drawMarks, type Mark } from './marks';
import { geometry, linearAxis, logAxis, plot } from './plot';
import { changeList, empty, group, note } from './shared';

const RECORDS_LISTED = 10;
const LEGEND_CREATORS = 8;

export interface ChartState {
  pinned: string | null;
  creator: string;
}

const redraws = new WeakMap<Element, (state: ChartState) => void>();

/** Draws the chart again for a new selection without rebuilding the rest of the panel around it. */
export const redrawChart = (chart: Element, state: ChartState) => redraws.get(chart)?.(state);

export function panel(
  key: string,
  state: ChartState,
  draw: (state: ChartState) => HTMLElement[],
  ...below: (HTMLElement | null)[]
): HTMLElement {
  const canvas = h('div', { class: 'chart-canvas' }, ...draw(state));
  const element = h('div', { class: 'stack', 'data-chart': key }, canvas, h('div', { class: 'chart-slot' }), ...below);
  redraws.set(element, (next) => canvas.replaceChildren(...draw(next)));
  return element;
}

const creatorLegend = (creators: string[], active: string) =>
  h(
    'div',
    { class: 'creators', role: 'group', 'aria-label': '按厂商高亮' },
    h('span', { class: 'mono-label' }, '按厂商高亮'),
    ...[['全部', ''], ...creators.map((c) => [c, c])].map(([label, value]) =>
      h(
        'button',
        { type: 'button', class: 'pick-chip', 'data-creator': value, 'aria-pressed': String(value === active) },
        label,
      ),
    ),
  );

export interface ScatterOptions {
  key: string;
  x: (model: LlmModel) => number | null;
  xTitle: string;
  xFormat: (n: number) => string;
  xBetter: 'low' | 'high';
  /** What a model on the frontier is better at than the smarter ones, e.g. "便宜". */
  tradeoff: string;
  label: string;
  width: number;
  state: ChartState;
}

export function renderScatter(models: LlmModel[], options: ScatterOptions): HTMLElement {
  const points = models.flatMap((m) => {
    const x = options.x(m);
    return x != null && x > 0 && m.intelligence != null ? [{ model: m, x, y: m.intelligence }] : [];
  });
  if (points.length < 2) return empty('有这两项数据的模型太少');

  const geo = geometry(options.width);
  const x = logAxis(
    Math.min(...points.map((p) => p.x)),
    Math.max(...points.map((p) => p.x)),
    geo.pad.left,
    geo.w - geo.pad.right,
  );
  const ys = points.map((p) => p.y);
  const y = linearAxis(Math.min(...ys), Math.max(...ys), geo.h - geo.pad.bottom, geo.pad.top, 10);
  const front = new Set(pareto(points, options.xBetter));
  const frontPoints = points.filter((_, i) => front.has(i)).sort((a, b) => a.x - b.x);
  const dots = points.map((p) => ({ x: x.at(p.x), y: y.at(p.y) }));
  const stairLine = stairs(frontPoints, options.xBetter)
    .map((p) => `${x.at(p.x)},${y.at(p.y)}`)
    .join(' ');

  const counts = new Map<string, number>();
  for (const p of points) counts.set(p.model.creator, (counts.get(p.model.creator) ?? 0) + 1);
  const legend = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, LEGEND_CREATORS)
    .map(([creator]) => creator);

  const draw = (state: ChartState): HTMLElement[] => {
    // A creator that dropped out of the chart (a filter was switched) must not leave everything faded.
    const active = counts.has(state.creator) ? state.creator : '';
    const marks = points.map((p, i): Mark => {
      const pinned = p.model.id === state.pinned;
      const lit = active !== '' && p.model.creator === active;
      return {
        ...dots[i],
        id: p.model.id,
        name: p.model.name,
        line: `${p.model.creator} · 智能 ${formatScore(p.y)} · ${options.xFormat(p.x)}`,
        weight: p.y,
        kind: pinned ? 'pinned' : lit ? 'lit' : !active && front.has(i) ? 'best' : 'plain',
        dim: active !== '' && !lit && !pinned,
      };
    });

    return [
      creatorLegend(legend, active),
      plot(
        geo,
        {
          label: `${options.label}：${points.length} 个模型，前沿上有 ${frontPoints.length} 个`,
          x,
          y,
          titles: { x: options.xTitle, y: '智能指数' },
        },
        [
          svg('polyline', { class: active ? 'front dim' : 'front', points: stairLine }),
          ...drawMarks(marks),
          ...drawLabels(geo, marks),
        ],
      ),
    ];
  };

  return panel(
    options.key,
    options.state,
    draw,
    note(
      `大实心点和阶梯线是前沿：没有别的模型比它们又${options.tradeoff}又聪明，阶梯线表示在对应的要求下能得到的最高智能 · 其余点悬停看名字，点击固定并展开详情，也可以按上面的厂商高亮`,
    ),
    group(
      `前沿 · ${frontPoints.length} 个模型`,
      changeList(
        [...frontPoints]
          .sort((a, b) => b.y - a.y)
          .map((p) => ({
            label: p.model.name,
            sub: p.model.creator,
            value: `${formatScore(p.y)} · ${options.xFormat(p.x)}`,
            model: p.model.id,
          })),
        '没有前沿模型',
      ),
    ),
  );
}

const monthIndex = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;

export interface FrontierOptions {
  metric: Metric;
  width: number;
  state: ChartState;
}

export function renderFrontier(months: MonthBest[], daily: Latest['daily'], options: FrontierOptions): HTMLElement {
  const { metric } = options;
  if (months.length < 2) return empty(`有发布日期和「${metric.label}」的模型太少`);

  const geo = geometry(options.width);
  const first = monthIndex(months[0].month);
  const last = monthIndex(months[months.length - 1].month);
  const x = linearAxis(first, last, geo.pad.left, geo.w - geo.pad.right, 12);
  const y = linearAxis(
    Math.min(...months.map((m) => m.value)),
    Math.max(...months.map((m) => m.top)),
    geo.h - geo.pad.bottom,
    geo.pad.top,
  );
  // Ticks fall on January, so the label is just the year.
  const yearOf = (index: number) => String(Math.floor(index / 12));
  const stepLine = months
    .flatMap((m, i) => {
      const px = x.at(monthIndex(m.month));
      const prev = i ? months[i - 1].top : m.top;
      return i ? [`${px},${y.at(prev)}`, `${px},${y.at(m.top)}`] : [`${px},${y.at(m.top)}`];
    })
    .join(' ');
  const dots = months.map((m) => ({ x: x.at(monthIndex(m.month)), y: y.at(m.value) }));

  const draw = (state: ChartState): HTMLElement[] => {
    // Later months weigh more, so the label budget goes to the newest records and older ones are left to hover.
    const marks = months.map((m, i): Mark => ({
      ...dots[i],
      id: m.best.id,
      name: m.best.name,
      line: `${m.best.creator} · ${m.month} · ${metric.format(m.value)}${m.record ? ' · 新纪录' : ''}`,
      weight: i,
      kind: m.best.id === state.pinned ? 'pinned' : m.record ? 'best' : 'plain',
    }));

    return [
      plot(
        geo,
        {
          label: `每月发布的模型里「${metric.label}」最高的一个，${months[0].month} 至 ${months[months.length - 1].month}`,
          x,
          y,
          titles: { x: '发布月份', y: metric.label },
          format: { x: yearOf, y: metric.format },
        },
        [svg('polyline', { class: 'front', points: stepLine }), ...drawMarks(marks), ...drawLabels(geo, marks)],
      ),
    ];
  };

  const records = months.filter((m) => m.record);
  const epoch = daily[daily.length - 1]?.epoch;
  const snapshots = metric.key === 'intelligence' ? daily.filter((d) => d.top != null && d.epoch === epoch) : [];
  return panel(
    'frontier',
    options.state,
    draw,
    note(
      `线：截至每个月发布过的「${metric.label}」最高值 · 大实心点：当月刷新纪录的模型，常驻标签只给最近几个 · 小点：当月最强但没破纪录 · 悬停看名字，点击展开详情 · 含已下线的模型`,
    ),
    group(
      `最近 ${Math.min(RECORDS_LISTED, records.length)} 次刷新纪录`,
      changeList(
        records
          .slice(-RECORDS_LISTED)
          .reverse()
          .map((m, i, list) => {
            const before = list[i + 1]?.value;
            return {
              label: m.best.name,
              sub: `${m.month} · ${m.best.creator}`,
              value:
                before == null ? metric.format(m.top) : `${metric.format(m.top)} (+${metric.format(m.top - before)})`,
              tone: 'up' as const,
              model: m.best.id,
            };
          }),
        '没有记录',
      ),
    ),
    snapshots.length >= 2
      ? group(
          '每日快照中的最高智能指数',
          changeList(
            snapshots
              .slice(-7)
              .reverse()
              .map((d) => ({ label: d.day, sub: `${d.models} 个模型`, value: formatScore(d.top!) })),
            '',
          ),
        )
      : metric.key === 'intelligence'
        ? note('每日快照会从今天开始积累，几天后这里会出现按天的变化')
        : null,
  );
}
