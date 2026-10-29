import { h } from '@/scripts/core/dom';
import { onPage } from '@/scripts/core/lifecycle';
import { readToken, writeToken } from '@/scripts/core/stats-token';
import { attachTooltip } from '@/scripts/core/tooltip';
import { ApiError } from '@/scripts/stats/api';
import { fetchChanges, fetchHistory, fetchLatest } from './api';
import { attachChartHover } from './chart-hover';
import { collapse, frontierByMonth, isListed, leadingCreators } from './data';
import { createDetails } from './details';
import { formatPrice, formatSpeed, INTELLIGENCE, metricsFor, type Metric } from './metrics';
import { categoriesOf, renderCreators, renderMedia } from './render/boards';
import { renderChanges } from './render/changes';
import { redrawChart, renderFrontier, renderScatter, type ChartState, type ScatterOptions } from './render/charts';
import { renderLeaderboard } from './render/leaderboard';
import { renderTimeline } from './render/timeline';
import { assignSlots, SLOTS, type WindowKey } from './timeline-data';
import { renderKpis } from './render/overview';
import { fillSelect, turnPage } from './render/shared';
import { explain, statusLine, warnings } from './status';
import type { Changes, Latest, MediaBoard } from './types';

const DEFAULT_LANES = 5;

onPage(() => {
  const root = document.querySelector<HTMLElement>('[data-model-watch]');
  if (!root) return;

  const endpoint = root.dataset.endpoint ?? '';
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const gate = $<HTMLFormElement>('[data-gate]');
  const gateInput = $<HTMLInputElement>('[data-token]');
  const gateError = $('[data-gate-error]');
  const dashboard = $('[data-dashboard]');
  const status = $('[data-status]');
  const merge = $<HTMLInputElement>('[data-merge]');
  const unlisted = $<HTMLInputElement>('[data-unlisted]');
  const metricSelect = $<HTMLSelectElement>('[data-metric]');
  const changeMetricSelect = $<HTMLSelectElement>('[data-change-metric]');
  const frontierMetricSelect = $<HTMLSelectElement>('[data-frontier-metric]');
  const timelineMetricSelect = $<HTMLSelectElement>('[data-timeline-metric]');
  const categorySelect = $<HTMLSelectElement>('[data-category]');

  const view = {
    token: readToken(),
    latest: null as Latest | null,
    changes: null as Changes | null,
    days: 7,
    metric: INTELLIGENCE as Metric,
    changeMetric: INTELLIGENCE as Metric,
    frontierMetric: INTELLIGENCE as Metric,
    timelineMetric: INTELLIGENCE as Metric,
    /** Creators the reader picked for the timeline; `null` until then, which shows the leading ones. */
    lanes: null as string[] | null,
    slots: {} as Record<string, number>,
    window: '2y' as WindowKey,
    metrics: [] as Metric[],
    board: 'text-to-image' as MediaBoard,
    category: '',
    pinned: null as string | null,
    creator: '',
  };
  let controller: AbortController | undefined;
  let generation = 0;
  let paintedWidth = 0;

  const show = (target: 'gate' | 'dashboard') => {
    gate.hidden = target !== 'gate';
    dashboard.hidden = target !== 'dashboard';
  };

  function signOut(message = '') {
    controller?.abort();
    view.token = null;
    writeToken(null);
    gateError.textContent = message;
    gateInput.value = '';
    show('gate');
  }

  function fail(error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (error instanceof ApiError && error.status === 401) return signOut(explain(error));
    status.textContent = explain(error);
  }

  function begin() {
    controller?.abort();
    controller = new AbortController();
    status.textContent = 'LOADING…';
    const id = ++generation;
    return { signal: controller.signal, stale: () => id !== generation };
  }

  const visible = () => (view.latest?.llm ?? []).filter((m) => unlisted.checked || isListed(m));

  function fillMetrics() {
    view.metrics = metricsFor(view.latest!.llm, view.latest!.index);
    const keep = (current: Metric) => view.metrics.find((m) => m.key === current.key) ?? INTELLIGENCE;
    view.metric = keep(view.metric);
    view.changeMetric = keep(view.changeMetric);
    view.frontierMetric = keep(view.frontierMetric);
    view.timelineMetric = keep(view.timelineMetric);
    fillSelect(metricSelect, view.metrics, view.metric.key);
    fillSelect(changeMetricSelect, view.metrics, view.changeMetric.key);
    // A record only means something for a value that gets better as it grows.
    const growing = view.metrics.filter((m) => m.better === 'high');
    fillSelect(frontierMetricSelect, growing, view.frontierMetric.key);
    fillSelect(timelineMetricSelect, growing, view.timelineMetric.key);
  }

  function paintStatus() {
    status.textContent = statusLine(view.latest!);
    $('[data-warn]').replaceChildren(...warnings(view.latest!).map((text) => h('p', {}, text)));
  }

  function paintLeaderboard() {
    $('[data-board]').replaceChildren(renderLeaderboard(visible(), view.metric, merge.checked));
  }

  const chartsWidth = () => $('[data-charts]').clientWidth;

  const chartState = (): ChartState => ({ pinned: view.pinned, creator: view.creator });

  const syncCharts = () =>
    dashboard.querySelectorAll('[data-chart]').forEach((chart) => redrawChart(chart, chartState()));

  const details = createDetails(root, {
    models: () => view.latest?.llm ?? [],
    metrics: () => view.metrics,
    history: (id) => fetchHistory(endpoint, view.token!, id),
    pin: (id) => {
      view.pinned = id;
      syncCharts();
    },
    fail,
  });

  function paintFrontier() {
    const metric = view.frontierMetric;
    const slot = $('[data-frontier]');
    // Retired models belong in the history of the frontier, so this one ignores the price filter.
    slot.replaceChildren(
      renderFrontier(frontierByMonth(collapse(view.latest!.llm, metric.value), metric.value), view.latest!.daily, {
        metric,
        width: chartsWidth(),
        state: chartState(),
      }),
    );
  }

  function lanesNow() {
    const models = view.latest!.llm;
    return view.lanes ?? leadingCreators(models, view.timelineMetric.value).slice(0, DEFAULT_LANES);
  }

  function paintTimeline() {
    const creators = lanesNow();
    view.slots = assignSlots(view.slots, creators);
    $('[data-timeline]').replaceChildren(
      renderTimeline(view.latest!.llm, {
        metric: view.timelineMetric,
        creators,
        slots: view.slots,
        window: view.window,
        width: chartsWidth(),
        state: chartState(),
      }),
    );
  }

  function paintScatters() {
    const models = visible();
    const byIntelligence = merge.checked ? collapse(models, (m) => m.intelligence) : models;
    const draw = (selector: string, options: Omit<ScatterOptions, 'width' | 'state'>) => {
      const slot = $(selector);
      slot.replaceChildren(renderScatter(byIntelligence, { ...options, width: chartsWidth(), state: chartState() }));
    };
    draw('[data-value]', {
      key: 'value',
      x: (m) => m.price_blended,
      xTitle: '混合价格 · 美元 / 百万 token（对数）',
      xFormat: formatPrice,
      xBetter: 'low',
      tradeoff: '便宜',
      label: '智能指数与价格',
    });
    draw('[data-speed]', {
      key: 'speed',
      x: (m) => m.tps,
      xTitle: '输出速度 · token / 秒（对数）',
      xFormat: formatSpeed,
      xBetter: 'high',
      tradeoff: '快',
      label: '智能指数与输出速度',
    });
  }

  function paintCharts() {
    // Details opened in a chart's slot go with the old drawing, so the pick must not outlive them.
    view.pinned = null;
    paintedWidth = chartsWidth();
    paintScatters();
    paintFrontier();
    paintTimeline();
  }

  function paintMedia() {
    const list = view.latest!.media[view.board] ?? [];
    const categories = categoriesOf(list);
    if (!categories.includes(view.category)) view.category = '';
    categorySelect.replaceChildren(
      h('option', { value: '', selected: !view.category }, '总榜'),
      ...categories.map((c) => h('option', { value: c, selected: c === view.category }, c)),
    );
    categorySelect.disabled = !categories.length;
    dashboard
      .querySelectorAll<HTMLElement>('[data-media]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.media === view.board)));
    $('[data-media-list]').replaceChildren(renderMedia(list, view.category));
  }

  function paintModels() {
    $('[data-kpis]').replaceChildren(...renderKpis(view.latest!));
    paintLeaderboard();
    paintCharts();
    $('[data-creators]').replaceChildren(renderCreators(visible()));
  }

  const paintChanges = () => {
    changeMetricSelect.disabled = !view.changes!.llm;
    $('[data-changes]').replaceChildren(renderChanges(view.changes!, view.changeMetric, view.latest?.index ?? null));
  };

  async function loadAll(): Promise<boolean> {
    const { signal, stale } = begin();
    try {
      const [latest, changes] = await Promise.all([
        fetchLatest(endpoint, view.token!, signal),
        fetchChanges(endpoint, view.token!, view.days, view.changeMetric.key, signal),
      ]);
      if (stale()) return false;
      view.latest = latest;
      view.changes = changes;
      details.forget();
      fillMetrics();
      paintStatus();
      paintChanges();
      paintModels();
      paintMedia();
      followScroll();
      return true;
    } catch (error) {
      if (!stale()) fail(error);
      return false;
    }
  }

  async function loadChanges() {
    const { signal, stale } = begin();
    try {
      const changes = await fetchChanges(endpoint, view.token!, view.days, view.changeMetric.key, signal);
      if (stale()) return;
      view.changes = changes;
      paintChanges();
      paintStatus();
    } catch (error) {
      if (!stale()) fail(error);
    }
  }

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const tab = target.closest<HTMLElement>('[data-tab]');
    if (tab) return selectTab(...(tab.dataset.tab!.split(':') as [string, string]));
    const anchor = target.closest<HTMLAnchorElement>('[data-anchor]');
    if (anchor) {
      event.preventDefault();
      markSection(anchor.dataset.anchor!);
      const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      return document
        .getElementById(anchor.dataset.anchor!)
        ?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    }
    const turn = target.closest<HTMLElement>('[data-turn]');
    if (turn) {
      details.clear();
      return turnPage(turn);
    }
    const timeRange = target.closest<HTMLElement>('[data-window]');
    if (timeRange) {
      view.window = timeRange.dataset.window as WindowKey;
      details.clear();
      return paintTimeline();
    }
    const lane = target.closest<HTMLElement>('[data-lane]');
    if (lane) {
      const now = lanesNow();
      const picked = lane.dataset.lane!;
      const next = now.includes(picked) ? now.filter((c) => c !== picked) : [...now, picked];
      // The last one stays, and so does the chart's room for colours.
      if (next.length && next.length <= SLOTS) view.lanes = next;
      details.clear();
      return paintTimeline();
    }
    const creator = target.closest<HTMLElement>('[data-creator]');
    if (creator) {
      const picked = creator.dataset.creator ?? '';
      view.creator = picked === view.creator ? '' : picked;
      return syncCharts();
    }
    const point = target.closest('[data-pick]');
    if (point) return void details.togglePoint(point);
    const model = target.closest<HTMLElement>('[data-model]');
    if (model) return void details.toggleListed(model);
    if (target.closest('[data-close-detail]')) return details.clear();
    const range = target.closest<HTMLElement>('[data-days]');
    if (range) {
      view.days = Number(range.dataset.days);
      root
        .querySelectorAll<HTMLElement>('[data-days]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === range)));
      return void loadChanges();
    }
    const board = target.closest<HTMLElement>('[data-media]');
    if (board) {
      view.board = board.dataset.media as MediaBoard;
      view.category = '';
      return paintMedia();
    }
    if (target.closest('[data-refresh]')) void loadAll();
    if (target.closest('[data-signout]')) signOut();
  };

  function selectTab(group: string, name: string) {
    const on = `${group}:${name}`;
    root!
      .querySelectorAll<HTMLElement>(`[data-tab^="${group}:"]`)
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === on)));
    root!.querySelectorAll<HTMLElement>(`[data-pane^="${group}:"]`).forEach((p) => (p.hidden = p.dataset.pane !== on));
    root!.querySelectorAll<HTMLElement>(`[data-show^="${group}:"]`).forEach((c) => (c.hidden = c.dataset.show !== on));
  }

  const metricOf = (key: string) => view.metrics.find((m) => m.key === key) ?? INTELLIGENCE;

  const onChange = (event: Event) => {
    if (!view.latest) return;
    if (event.target === merge || event.target === unlisted) paintModels();
    if (event.target === metricSelect) {
      view.metric = metricOf(metricSelect.value);
      paintLeaderboard();
    }
    if (event.target === frontierMetricSelect) {
      view.frontierMetric = metricOf(frontierMetricSelect.value);
      details.clear();
      paintFrontier();
    }
    if (event.target === timelineMetricSelect) {
      view.timelineMetric = metricOf(timelineMetricSelect.value);
      details.clear();
      paintTimeline();
    }
    if (event.target === changeMetricSelect) {
      view.changeMetric = metricOf(changeMetricSelect.value);
      void loadChanges();
    }
    if (event.target === categorySelect) {
      view.category = categorySelect.value;
      paintMedia();
    }
  };

  const onSubmit = async (event: Event) => {
    event.preventDefault();
    const entered = gateInput.value.trim();
    if (!entered) return;
    view.token = entered;
    gateError.textContent = '';
    show('dashboard');
    if (await loadAll()) writeToken(entered);
  };

  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  gate.addEventListener('submit', onSubmit);
  const detachTooltip = attachTooltip(root);
  const detachHover = attachChartHover(root);

  // A scrollbar appearing is not worth redrawing for: a drawing a few pixels off only scales a little.
  const RESIZE_STEP = 40;
  const observer = new ResizeObserver(() => {
    const width = chartsWidth();
    if (view.latest && width && Math.abs(width - paintedWidth) >= RESIZE_STEP) paintCharts();
  });
  observer.observe($('[data-charts]'));

  // The last section whose top has passed a line a third of the way down; at the very bottom, the last section.
  const sections = [...dashboard.querySelectorAll<HTMLElement>('[data-section]')];
  const markSection = (id: string) =>
    dashboard.querySelectorAll<HTMLElement>('[data-anchor]').forEach((a) => {
      if (a.dataset.anchor === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  function followScroll() {
    const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    const passed = sections.filter((section) => section.getBoundingClientRect().top <= innerHeight * 0.35);
    markSection((atEnd ? sections.at(-1) : (passed.at(-1) ?? sections[0]))!.id);
  }
  let frame = 0;
  const onScroll = () => {
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      followScroll();
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  if (!endpoint) {
    gateError.textContent = '还没有启用：site.ts 里的 analytics.endpoint 是空的';
    gateInput.disabled = true;
    show('gate');
  } else if (view.token) {
    show('dashboard');
    void loadAll();
  } else {
    show('gate');
  }

  return () => {
    controller?.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    detachHover();
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
    gate.removeEventListener('submit', onSubmit);
    detachTooltip();
  };
});
