import { thumb } from '@/lib/assets/thumb';
import { fitSize } from './geometry';
import type { LightboxItem, Slide } from './types';

const preview = (src: string) => thumb(src, 1600) ?? src;

export function createSlide(track: HTMLElement, item: LightboxItem, onLoad: () => void): Slide {
  const el = document.createElement('div');
  el.className = 'lb-slide nb';

  const img = document.createElement('img');
  img.className = 'lb-img';
  img.alt = item.description ?? item.title ?? '';
  img.draggable = false;
  img.src = preview(item.src);
  img.addEventListener('error', () => {
    if (!img.src.endsWith(encodeURI(item.src))) img.src = item.src;
  });
  img.addEventListener('load', onLoad);

  el.append(img);
  track.append(el);
  return { el, img };
}

export function upgradeToOriginal(slide: Slide, item: LightboxItem) {
  const hi = new Image();
  hi.src = item.src;
  void hi.decode?.().then(
    () => {
      if (slide.img.isConnected) slide.img.src = item.src;
    },
    () => {},
  );
}

/** max-width / max-height would show a small thumbnail at natural size, then jump when the original loads; explicit sizes keep both identical. */
export function fitSlide(slide: Slide) {
  const cs = getComputedStyle(slide.el);
  const size = fitSize(
    { width: slide.img.naturalWidth, height: slide.img.naturalHeight },
    {
      width: slide.el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      height: slide.el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
    },
  );
  if (!size) return;
  slide.img.style.width = `${size.width}px`;
  slide.img.style.height = `${size.height}px`;
}

export const widthOf = (slide: Slide, stage: HTMLElement) => slide.img.offsetWidth || stage.clientWidth * 0.6;
