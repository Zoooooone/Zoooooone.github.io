import type { Cleanup } from '@/scripts/core/lifecycle';
import { createLightbox } from '@/scripts/lightbox/lightbox';

export function runProseImages(cleanups: Cleanup[]) {
  const imgs = [...document.querySelectorAll<HTMLImageElement>('.prose img')].filter(
    (img) => !img.closest('a') && !img.closest('.gallery'),
  );
  if (!imgs.length) return;
  const lightbox = createLightbox(cleanups);
  const items = imgs.map((img) => ({ src: img.getAttribute('src') ?? img.src, description: img.alt || undefined }));
  imgs.forEach((img, i) => {
    img.classList.add('zoomable');
    const open = () => lightbox.open(items, i);
    img.addEventListener('click', open);
    cleanups.push(() => {
      img.removeEventListener('click', open);
      img.classList.remove('zoomable');
    });
  });
}
