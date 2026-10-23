import { onPage } from '@/scripts/core/lifecycle';
import { ApiError, fetchSummary, fetchVisits } from './api';
import {
  renderBehavior,
  renderDaily,
  renderDevices,
  renderFilters,
  renderHeatmap,
  renderKpis,
  renderPages,
  renderPlaces,
  renderSources,
  renderVisitorSummary,
  renderVisits,
} from './render';
import { attachTooltip } from './tooltip';
import type { Filters, Summary, VisitRow } from './types';

const TOKEN_KEY = 'stats-token';

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const writeToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

function explain(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return '口令不正确';
    if (error.status === 404) return '统计接口未启用：Worker 还没有设置 STATS_TOKEN';
    return `统计服务返回了错误（${error.status}）`;
  }
  // A refused origin looks the same as being offline: the 403 has no CORS header, so the browser hides it.
  return '无法连接统计服务：网络不通，或当前网址不在 Worker 的 ALLOWED_ORIGINS 里';
}

onPage(() => {
  const root = document.querySelector<HTMLElement>('[data-stats]');
  if (!root) return;

  const endpoint = root.dataset.endpoint ?? '';
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const gate = $<HTMLFormElement>('[data-gate]');
  const gateInput = $<HTMLInputElement>('[data-token]');
  const gateError = $('[data-gate-error]');
  const dashboard = $('[data-dashboard]');
  const status = $('[data-status]');
  const firstOnly = $<HTMLInputElement>('[data-first]');
  const botsToggle = $<HTMLInputElement>('[data-bots]');
  const more = $<HTMLButtonElement>('[data-more]');

  const view = {
    token: readToken(),
    days: 30,
    filters: {} as Filters,
    rows: [] as VisitRow[],
    next: null as number | null,
  };
  let controller: AbortController | undefined;
  let generation = 0;

  const query = () => ({ days: view.days, bots: botsToggle.checked, ...view.filters });
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

  function paintVisits() {
    $('[data-visits]').replaceChildren(renderVisits(view.rows, Date.now()));
    $('[data-filters]').replaceChildren(...renderFilters(view.filters));
    $('[data-visitor]').replaceChildren(
      ...(view.filters.visitor ? renderVisitorSummary(view.filters.visitor, view.rows) : []),
    );
    firstOnly.checked = Boolean(view.filters.first);
    more.hidden = view.next === null;
    more.disabled = false;
  }

  function fail(error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (error instanceof ApiError && error.status === 401) return signOut(explain(error));
    status.textContent = explain(error);
  }

  async function loadVisits(signal: AbortSignal, before?: number) {
    const list = await fetchVisits(endpoint, view.token!, { ...query(), before }, signal);
    view.rows = before === undefined ? list.visits : [...view.rows, ...list.visits];
    view.next = list.next;
  }

  function paintSummary(summary: Summary) {
    $('[data-kpis]').replaceChildren(...renderKpis(summary));
    $('[data-daily]').replaceChildren(renderDaily(summary, Date.now()));
    $('[data-heat]').replaceChildren(renderHeatmap(summary.heatmap));
    $('[data-pages]').replaceChildren(renderPages(summary.pages));
    $('[data-sources]').replaceChildren(renderSources(summary));
    $('[data-places]').replaceChildren(renderPlaces(summary));
    $('[data-devices]').replaceChildren(renderDevices(summary));
    $('[data-behavior]').replaceChildren(renderBehavior(summary));
  }

  function begin() {
    controller?.abort();
    controller = new AbortController();
    status.textContent = 'LOADING…';
    const id = ++generation;
    return { signal: controller.signal, stale: () => id !== generation };
  }

  const markUpdated = () => {
    status.textContent = `UPDATED ${new Date().toLocaleTimeString('en-GB')}`;
  };

  async function loadAll(): Promise<boolean> {
    const { signal, stale } = begin();
    try {
      const [summary] = await Promise.all([fetchSummary(endpoint, view.token!, query(), signal), loadVisits(signal)]);
      if (stale()) return false;

      paintSummary(summary);
      paintVisits();
      markUpdated();
      return true;
    } catch (error) {
      if (!stale()) fail(error);
      return false;
    }
  }

  async function reloadVisits() {
    const { signal, stale } = begin();
    try {
      await loadVisits(signal);
      if (stale()) return;
      paintVisits();
      markUpdated();
    } catch (error) {
      if (!stale()) fail(error);
    }
  }

  async function loadMore() {
    if (view.next === null) return;
    more.disabled = true;
    try {
      await loadVisits(new AbortController().signal, view.next);
      paintVisits();
    } catch (error) {
      more.disabled = false;
      fail(error);
    }
  }

  const setFilters = (next: Filters) => {
    view.filters = next;
    void reloadVisits();
  };

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;

    const toggle = target.closest<HTMLElement>('[data-toggle]');
    if (toggle) {
      const detail = root.querySelector<HTMLElement>(`#${toggle.dataset.toggle}`)!;
      const opening = detail.hidden;
      detail.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
      toggle.textContent = opening ? '▾' : '▸';
      return;
    }

    const filter = target.closest<HTMLElement>('[data-filter]');
    if (filter) {
      const key = filter.dataset.filter as 'path' | 'country' | 'visitor';
      setFilters({ ...view.filters, [key]: filter.dataset.value });
      // The list is far below the ranking that was clicked, so without this nothing seems to happen.
      if (!filter.closest('[data-visits]')) {
        const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
        $('[data-visits-panel]').scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
      }
      return;
    }
    const clear = target.closest<HTMLElement>('[data-clear]');
    if (clear) {
      const { [clear.dataset.clear as keyof Filters]: _removed, ...rest } = view.filters;
      return setFilters(rest);
    }
    const range = target.closest<HTMLElement>('[data-days]');
    if (range) {
      view.days = Number(range.dataset.days);
      root
        .querySelectorAll<HTMLElement>('[data-days]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === range)));
      void loadAll();
    }
    if (target.closest('[data-refresh]')) void loadAll();
    if (target.closest('[data-signout]')) signOut();
    if (target.closest('[data-more]')) void loadMore();
  };

  const onChange = (event: Event) => {
    if (event.target === botsToggle) void loadAll();
    if (event.target === firstOnly) setFilters({ ...view.filters, first: firstOnly.checked || undefined });
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

  if (!endpoint) {
    gateError.textContent = '统计还没有启用：site.ts 里的 analytics.endpoint 是空的';
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
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
    detachTooltip();
    gate.removeEventListener('submit', onSubmit);
  };
});
