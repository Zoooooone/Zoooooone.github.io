// Glyph widths differ, so each line is measured and pinned as a nowrap block; otherwise wrapped titles jump between lines.
import { onPage } from '@/scripts/core/lifecycle';

const SELECTOR = '.page-head h1, .post-head h1, .latest-body h2, .pinned-body h3';
const LATIN = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@+=<>/';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Job = { el: HTMLElement; restore: () => void };

function measureLines(node: Text): string[] | null {
  const text = node.data;
  const range = document.createRange();
  const lines: string[] = [];
  let current = '';
  let currentTop: number | null = null;

  let offset = 0;
  for (const ch of text) {
    range.setStart(node, offset);
    range.setEnd(node, offset + ch.length);
    const rects = range.getClientRects();
    const rect = rects.length ? rects[0] : null;
    if (rect && rect.width > 0) {
      if (currentTop === null || Math.abs(rect.top - currentTop) > 2) {
        if (currentTop !== null) lines.push(current);
        current = '';
        currentTop = rect.top;
      }
    }
    current += ch;
    offset += ch.length;
  }
  if (current) lines.push(current);
  return lines.length ? lines : null;
}

function start(el: HTMLElement, jobs: Job[], timers: number[]) {
  if (el.childNodes.length !== 1 || el.firstChild?.nodeType !== Node.TEXT_NODE) return;
  if (el.dataset.scrambled === '1') return;

  const original = el.textContent ?? '';
  const pool = [...original].filter((c) => /\S/.test(c));
  if (pool.length < 3) return;

  const lines = measureLines(el.firstChild as Text);
  if (!lines) return;

  el.dataset.scrambled = '1';
  const cjk = pool.some((c) => /[぀-ヿ㐀-鿿]/.test(c));
  const noise = () =>
    cjk ? pool[Math.floor(Math.random() * pool.length)] : LATIN[Math.floor(Math.random() * LATIN.length)];

  const rows: { span: HTMLSpanElement; chars: string[]; start: number }[] = [];
  el.textContent = '';
  let cursor = 0;
  lines.forEach((line) => {
    const span = document.createElement('span');
    span.style.cssText = 'display:block;white-space:pre;overflow:hidden';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = line;
    el.append(span);
    const chars = [...line];
    rows.push({ span, chars, start: cursor });
    cursor += chars.length;
  });
  el.setAttribute('aria-label', original);

  const restore = () => {
    el.textContent = original;
    el.removeAttribute('aria-label');
    delete el.dataset.scrambled;
  };
  jobs.push({ el, restore });

  const totalChars = cursor;
  const total = Math.min(1100, Math.max(700, 300 + totalChars * 28));
  const tick = 45;
  const begin = performance.now() + 150;

  const step = () => {
    const t = (performance.now() - begin) / total;
    if (t < 0) {
      timers.push(window.setTimeout(step, tick));
      return;
    }
    if (t >= 1) {
      el.textContent = original;
      el.removeAttribute('aria-label');
      return;
    }
    const solved = Math.floor(t * totalChars * 1.1);
    rows.forEach((row) => {
      let out = '';
      for (let i = 0; i < row.chars.length; i++) {
        const c = row.chars[i];
        out += row.start + i < solved || !/\S/.test(c) ? c : noise();
      }
      row.span.textContent = out;
    });
    timers.push(window.setTimeout(step, tick));
  };
  step();
}

onPage(() => {
  if (reduced()) return;
  if (document.documentElement.dataset.fx === 'off') return;

  const timers: number[] = [];
  const jobs: Job[] = [];
  document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => start(el, jobs, timers));

  return () => {
    timers.forEach((t) => clearTimeout(t));
    jobs.forEach((j) => j.restore());
  };
});
