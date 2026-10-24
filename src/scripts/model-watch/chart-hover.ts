import { svg } from '@/scripts/core/dom';

const CARD_PAD = 8;
const CARD_HEIGHT = 40;
const OFFSET = 12;
const EDGE = 4;

export function hoverCard(): SVGGElement {
  return svg(
    'g',
    { class: 'hover-card', style: 'display:none', 'pointer-events': 'none' },
    svg('rect', { height: CARD_HEIGHT }),
    svg('text', { class: 'card-name', x: CARD_PAD, y: 16 }),
    svg('text', { class: 'card-line', x: CARD_PAD, y: 32 }),
  );
}

export function attachChartHover(root: HTMLElement): () => void {
  let current: SVGGElement | null = null;

  const cardOf = (point: SVGGElement) => point.ownerSVGElement?.querySelector<SVGGElement>('.hover-card') ?? null;

  const hide = () => {
    if (current) {
      current.classList.remove('hot');
      const card = cardOf(current);
      if (card) card.style.display = 'none';
    }
    current = null;
  };

  const show = (point: SVGGElement) => {
    hide();
    const chart = point.ownerSVGElement;
    const card = cardOf(point);
    if (!chart || !card) return;
    current = point;
    point.classList.add('hot');

    const [name, line] = card.querySelectorAll('text');
    name.textContent = point.dataset.name ?? '';
    line.textContent = point.dataset.line ?? '';
    // The text has to be on screen to be measured.
    card.style.display = '';
    const width = Math.ceil(Math.max(name.getComputedTextLength(), line.getComputedTextLength())) + CARD_PAD * 2;
    card.querySelector('rect')!.setAttribute('width', String(width));

    const chartWidth = Number(chart.getAttribute('width'));
    const x = Number(point.dataset.x);
    const y = Number(point.dataset.y);
    const left = x + OFFSET + width > chartWidth - EDGE ? x - OFFSET - width : x + OFFSET;
    const top = y - OFFSET - CARD_HEIGHT < EDGE ? y + OFFSET : y - OFFSET - CARD_HEIGHT;
    card.setAttribute('transform', `translate(${Math.max(EDGE, left)} ${top})`);
  };

  const onPointer = (event: PointerEvent) => {
    const point = (event.target as Element).closest<SVGGElement>('.scatter .pt');
    if (!point) return hide();
    if (point !== current) show(point);
  };

  root.addEventListener('pointermove', onPointer);
  root.addEventListener('pointerdown', onPointer);
  root.addEventListener('pointerleave', hide);
  return () => {
    root.removeEventListener('pointermove', onPointer);
    root.removeEventListener('pointerdown', onPointer);
    root.removeEventListener('pointerleave', hide);
  };
}
