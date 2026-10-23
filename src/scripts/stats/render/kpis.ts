import { h } from '../dom';
import { formatCount, formatDuration, percent, scrollLabel } from '../format';
import type { Summary } from '../types';
import { NOT_MEASURED } from './shared';

export function renderKpis({ totals, behavior }: Summary): HTMLElement[] {
  const kpi = (label: string, value: string, sub: string) =>
    h(
      'div',
      { class: 'kpi frame cut-s' },
      h('span', { class: 'mono-label' }, label),
      h('b', {}, value),
      h('small', {}, sub),
    );
  const share = (label: string, signal: Summary['behavior']['interaction'], what: string) =>
    kpi(
      label,
      percent(signal),
      signal.measured ? `${formatCount(signal.yes)} / ${formatCount(signal.measured)} 次访问${what}` : NOT_MEASURED,
    );

  return [
    kpi('VIEWS · 访问', formatCount(totals.views), '页面浏览次数'),
    kpi('VISITORS · 访客', formatCount(totals.visitors), '按浏览器区分'),
    kpi('NEW · 新访客', formatCount(totals.newVisitors), `回访 ${formatCount(totals.returningVisitors)}`),
    kpi('TIME · 平均停留', formatDuration(totals.avgDurationMs), '仅统计有记录的页面'),
    share('INTERACTED · 互动', behavior.interaction, '有真实点击或按键'),
    kpi(
      'SCROLL · 平均滚动',
      scrollLabel(behavior.scroll.average),
      behavior.scroll.measured ? `${formatCount(behavior.scroll.measured)} 次访问已测量` : NOT_MEASURED,
    ),
    share('AUTOMATED · 自动化', behavior.automation, '带自动化特征'),
    share('TOUCH · 触屏', behavior.touch, '来自触屏设备'),
  ];
}
