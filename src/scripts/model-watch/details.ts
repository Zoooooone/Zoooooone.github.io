import { h } from '@/scripts/core/dom';
import type { Metric } from './metrics';
import { renderDetail } from './render/detail';
import type { History, LlmModel } from './types';

export interface DetailsContext {
  models: () => LlmModel[];
  metrics: () => Metric[];
  history: (id: string) => Promise<History>;
  /** Marks a model in the charts, or clears the mark with `null`. */
  pin: (id: string | null) => void;
  fail: (error: unknown) => void;
}

/** A model's details open as one row where the reader clicked: under a list item, or in a chart's slot. */
export function createDetails(root: HTMLElement, ctx: DetailsContext) {
  const histories = new Map<string, History>();

  function close() {
    root.querySelectorAll<HTMLElement>('[data-detail-row]').forEach((row) => {
      row.previousElementSibling?.querySelector('[data-model]')?.setAttribute('aria-expanded', 'false');
      row.remove();
    });
  }

  async function show(model: LlmModel, tag: 'li' | 'div', place: (row: HTMLElement) => void) {
    const cached = histories.get(model.id);
    const row = h(
      tag,
      { class: 'detail-row', 'data-detail-row': model.id },
      renderDetail(model, ctx.metrics(), cached ?? null),
    );
    place(row);
    if (cached) return;
    try {
      const history = await ctx.history(model.id);
      histories.set(model.id, history);
      if (row.isConnected) row.replaceChildren(renderDetail(model, ctx.metrics(), history));
    } catch (error) {
      ctx.fail(error);
    }
  }

  /** Opens or closes one model, and keeps only that one marked in the charts. */
  async function toggle(model: LlmModel, wasOpen: boolean, open: () => Promise<void>) {
    close();
    ctx.pin(wasOpen ? null : model.id);
    if (!wasOpen) await open();
  }

  const modelOf = (id: string) => ctx.models().find((m) => m.id === id);

  return {
    close,
    /** Forgets what was fetched, for when the page loads fresh data. */
    forget: () => histories.clear(),
    /** Closes the details and clears the mark. */
    clear() {
      close();
      ctx.pin(null);
    },
    async toggleListed(button: HTMLElement) {
      const id = button.dataset.model!;
      const item = button.closest('li');
      const model = modelOf(id);
      if (!item || !model) return;
      await toggle(model, item.nextElementSibling?.getAttribute('data-detail-row') === id, async () => {
        button.setAttribute('aria-expanded', 'true');
        await show(model, 'li', (row) => item.after(row));
      });
    },
    async togglePoint(point: Element) {
      const id = (point as HTMLElement).dataset.pick!;
      const slot = point.closest('[data-chart]')?.querySelector<HTMLElement>('.chart-slot');
      const model = modelOf(id);
      if (!slot || !model) return;
      const wasOpen = slot.querySelector('[data-detail-row]')?.getAttribute('data-detail-row') === id;
      await toggle(model, wasOpen, () => show(model, 'div', (row) => slot.replaceChildren(row)));
    },
  };
}
