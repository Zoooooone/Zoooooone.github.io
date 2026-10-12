import type { LightboxItem } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export type LightboxShell = {
  box: HTMLElement;
  stage: HTMLElement;
  track: HTMLElement;
  cap: HTMLElement;
  level: HTMLElement;
};

export function createShell(): LightboxShell {
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `
    <div class="lb-stage"><div class="lb-track"></div></div>
    <div class="cap"></div>
    <div class="lb-tools">
      <button type="button" class="lb-out" aria-label="缩小">−</button>
      <span class="lb-level">100%</span>
      <button type="button" class="lb-in" aria-label="放大">＋</button>
      <button type="button" class="lb-reset" aria-label="适应窗口">FIT</button>
      <button type="button" class="lb-close" aria-label="关闭">✕</button>
    </div>
    <button type="button" class="prev" aria-label="上一张">‹</button>
    <button type="button" class="next" aria-label="下一张">›</button>`;
  document.body.append(box);

  return {
    box,
    stage: box.querySelector<HTMLElement>('.lb-stage')!,
    track: box.querySelector<HTMLElement>('.lb-track')!,
    cap: box.querySelector<HTMLElement>('.cap')!,
    level: box.querySelector<HTMLElement>('.lb-level')!,
  };
}

export function renderCaption(cap: HTMLElement, item: LightboxItem, index: number, total: number) {
  const counter = document.createElement('span');
  counter.className = 'counter';
  counter.textContent = `${pad(index + 1)} / ${pad(total)}`;
  const label = document.createElement('span');
  label.textContent = [item.title, item.description].filter(Boolean).join(' · ');
  cap.replaceChildren(counter, label);
}
