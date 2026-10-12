import { thumb } from '@/lib/assets/thumb';
import type { Cleanup } from '@/scripts/core/lifecycle';
import { createLightbox } from '@/scripts/lightbox/lightbox';

type GalleryItem = { src: string; title?: string; description?: string; w?: number; h?: number };

export async function runGalleries(cleanups: Cleanup[], isStale: () => boolean) {
  const galleries = document.querySelectorAll<HTMLElement>('.gallery[data-src]');
  if (!galleries.length) return;
  const lightbox = createLightbox(cleanups);

  for (const el of galleries) {
    try {
      const items: GalleryItem[] = await (await fetch(el.dataset.src!)).json();
      if (isStale()) return;
      el.replaceChildren();
      items.forEach((it, i) => {
        const fig = document.createElement('figure');
        fig.className = 'reveal';
        const img = document.createElement('img');
        img.src = thumb(it.src, 800) ?? it.src;
        img.addEventListener('error', () => {
          if (img.src.indexOf(it.src) === -1) img.src = it.src;
        });
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = it.description ?? it.title ?? '';
        if (it.w && it.h) {
          img.width = it.w;
          img.height = it.h;
          fig.style.aspectRatio = `${it.w} / ${it.h}`;
        }
        fig.append(img);

        const idx = document.createElement('span');
        idx.className = 'idx';
        idx.textContent = String(i + 1).padStart(2, '0');
        fig.append(idx);

        const text = [it.title, it.description].filter(Boolean).join(' · ');
        if (text) {
          const c = document.createElement('figcaption');
          c.textContent = text;
          fig.append(c);
        }
        fig.addEventListener('click', () => lightbox.open(items, i));
        el.append(fig);
      });
    } catch {
      el.remove();
    }
  }
}

export function runGalleryReveal(cleanups: Cleanup[]) {
  const targets = document.querySelectorAll<HTMLElement>('.reveal');
  if (!targets.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );

  const vh = window.innerHeight;
  targets.forEach((t) => {
    if (t.getBoundingClientRect().top < vh) return;
    t.classList.add('pre');
    io.observe(t);
  });

  const timer = setTimeout(() => targets.forEach((t) => t.classList.add('in')), 4000);
  cleanups.push(() => {
    io.disconnect();
    clearTimeout(timer);
  });
}
