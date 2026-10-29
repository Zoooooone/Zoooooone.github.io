import { h } from '@/scripts/core/dom';
import {
  SCROLL_STEPS,
  VIEWPORT_STEPS,
  VIEWPORT_TICKS,
  countryName,
  formatCount,
  formatDuration,
  languageName,
  navLabel,
  shareOf,
  withOther,
} from '../format';
import type { Filters, Named, Summary } from '../types';
import { empty, filterButton, NOT_MEASURED, group } from './shared';
import { renderColumns, renderShare } from './charts';

/** Offers a line break after each slash, so a long path or time zone wraps between its parts and not inside a word. */
function breakable(text: string): (string | HTMLElement)[] {
  return text.split(/(?<=\/)/).flatMap((part, i) => (i === 0 ? [part] : [h('wbr'), part]));
}

interface RankItem {
  label: string;
  value: number;
  sub?: string;
  inline?: boolean;
  valueText?: string;
  tip?: string;
  filter?: { key: keyof Filters; value: string };
}

function renderRank(items: RankItem[], emptyText?: string): HTMLElement {
  if (!items.length || items.every((i) => i.value === 0)) return empty(emptyText);
  const max = Math.max(...items.map((i) => i.value));
  return h(
    'ol',
    { class: 'rank' },
    ...items.map((item) =>
      h(
        'li',
        { style: `--w:${(item.value / max) * 100}%`, 'data-tip': item.tip },
        h(
          'span',
          { class: item.inline ? 'rank-label inline' : 'rank-label' },
          item.filter
            ? filterButton(item.filter.key, item.filter.value, breakable(item.label))
            : h('span', {}, ...breakable(item.label)),
          item.sub ? h('small', {}, item.sub) : null,
        ),
        h('span', { class: 'rank-bar', 'aria-hidden': 'true' }),
        h('span', { class: 'rank-num' }, item.valueText ?? formatCount(item.value)),
      ),
    ),
  );
}

const named = (list: Named[], label: (name: string) => string = (name) => name) =>
  renderRank(
    list.map((n) => ({ label: label(n.name), value: n.views, sub: label(n.name) === n.name ? undefined : n.name })),
  );

export function renderPages(pages: Summary['pages']): HTMLElement {
  return renderRank(
    pages.map((p) => ({
      label: p.path,
      value: p.views,
      sub: `${formatCount(p.visitors)} 位访客 · ${formatDuration(p.avg_ms)}`,
      filter: { key: 'path', value: p.path },
    })),
  );
}

export function renderSources({ referrers, utm }: Pick<Summary, 'referrers' | 'utm'>): HTMLElement {
  const tags = [
    group('来源参数 · utm_source', named(utm.sources)),
    ...(utm.mediums.length ? [group('utm_medium', named(utm.mediums))] : []),
    ...(utm.campaigns.length ? [group('utm_campaign', named(utm.campaigns))] : []),
  ];
  return h(
    'div',
    { class: 'stack' },
    group(
      '外站来源',
      referrers.external.length
        ? renderRank(referrers.external.map((r) => ({ label: r.host, value: r.views })))
        : empty('暂无外站来源'),
    ),
    h(
      'p',
      { class: 'stats-note mono-label' },
      `直接访问 ${formatCount(referrers.direct)} · 站内跳转 ${formatCount(referrers.internal)}`,
    ),
    ...(utm.sources.length ? tags : [h('p', { class: 'stats-note mono-label' }, '暂无带来源参数的访问')]),
  );
}

export function renderPlaces(summary: Summary): HTMLElement {
  return h(
    'div',
    { class: 'stats-split' },
    group(
      '国家与地区',
      renderRank(
        summary.countries.map((c) => ({
          label: countryName(c.name),
          value: c.views,
          sub: c.name,
          filter: { key: 'country', value: c.name },
        })),
      ),
    ),
    group('城市', renderRank(summary.cities.map((c) => ({ label: c.city, value: c.views, sub: c.country })))),
    group('网络（运营商）', named(summary.networks)),
    group('时区', named(summary.timezones)),
  );
}

export function renderDevices(summary: Summary): HTMLElement {
  const total = summary.totals.views;
  const ranked = (list: Named[], limit: number, label = (name: string) => name, inline = false) =>
    renderRank(
      withOther(list, limit, total).map((item) => ({
        label: item.other ? item.name : label(item.name),
        sub: item.other || label(item.name) === item.name ? undefined : item.name,
        inline,
        value: item.views,
        valueText: shareOf(item.views, total),
        tip: `${item.name} · ${formatCount(item.views)} 次访问`,
      })),
    );
  return h(
    'div',
    { class: 'stack' },
    h(
      'div',
      { class: 'shares' },
      renderShare('设备', summary.devices, total),
      renderShare('浏览器', summary.browsers, total),
      renderShare('系统', summary.systems, total),
    ),
    h(
      'div',
      { class: 'stats-split' },
      group('窗口宽度', renderColumns(VIEWPORT_STEPS, summary.viewportWidths, NOT_MEASURED, VIEWPORT_TICKS)),
      group('屏幕尺寸', ranked(summary.screens, 6)),
      group('语言', ranked(summary.languages, 5, languageName, true)),
    ),
  );
}

export function renderBehavior(summary: Summary): HTMLElement {
  const navTotal = summary.navTypes.reduce((sum, n) => sum + n.views, 0);
  return h(
    'div',
    { class: 'stats-split' },
    group('滚动深度', renderColumns(SCROLL_STEPS, summary.scrollBuckets, NOT_MEASURED)),
    group(
      '进入方式',
      renderRank(
        summary.navTypes.map((n) => ({
          label: navLabel(n.name),
          sub: n.name,
          inline: true,
          value: n.views,
          valueText: shareOf(n.views, navTotal),
          tip: `${navLabel(n.name)} · ${formatCount(n.views)} 次访问`,
        })),
        NOT_MEASURED,
      ),
    ),
  );
}
