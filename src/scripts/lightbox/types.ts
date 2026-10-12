export type LightboxItem = { src: string; title?: string; description?: string };

export type Slide = { el: HTMLElement; img: HTMLImageElement };

export type LightboxState = {
  items: LightboxItem[];
  at: number;
  prev: Slide | null;
  cur: Slide | null;
  next: Slide | null;
  img: HTMLImageElement | null;
  scale: number;
  tx: number;
  ty: number;
  trackX: number;
  dPrev: number;
  dNext: number;
  animating: boolean;
  commitTimer: number;
};
