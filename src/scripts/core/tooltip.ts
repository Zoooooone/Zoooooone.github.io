import { h } from './dom';

// Own tooltip: the browser's title tooltip waits a second and cannot be aimed at a thin bar.
export function attachTooltip(root: HTMLElement): () => void {
  const tip = h('div', { class: 'stats-tip', role: 'tooltip', hidden: true });
  document.body.append(tip);

  const onPointer = (event: PointerEvent) => {
    const source = (event.target as Element).closest('[data-tip]');
    if (!source) {
      tip.hidden = true;
      return;
    }
    tip.textContent = source.getAttribute('data-tip');
    tip.hidden = false;
    const left = Math.min(event.clientX + 14, innerWidth - tip.offsetWidth - 8);
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${Math.max(8, event.clientY - tip.offsetHeight - 12)}px`;
  };
  const hide = () => {
    tip.hidden = true;
  };

  root.addEventListener('pointermove', onPointer);
  root.addEventListener('pointerdown', onPointer);
  root.addEventListener('pointerleave', hide);

  return () => {
    root.removeEventListener('pointermove', onPointer);
    root.removeEventListener('pointerdown', onPointer);
    root.removeEventListener('pointerleave', hide);
    tip.remove();
  };
}
