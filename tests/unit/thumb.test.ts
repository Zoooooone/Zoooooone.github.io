import { describe, expect, it } from 'vitest';
import { thumb } from '@/lib/assets/thumb';

describe('thumb', () => {
  it('maps bitmaps under /assets/img and /assets/src to generated WebP thumbnails', () => {
    expect(thumb('/assets/img/a/b.jpg')).toBe('/assets/thumbs/800/img/a/b.jpg.webp');
    expect(thumb('/assets/src/Odawara/x.JPEG', 1600)).toBe('/assets/thumbs/1600/src/Odawara/x.JPEG.webp');
    expect(thumb('/assets/img/wallpapers/w.png', 2560)).toBe('/assets/thumbs/2560/img/wallpapers/w.png.webp');
  });

  it('returns everything else unchanged', () => {
    expect(thumb('/assets/img/icon.svg')).toBe('/assets/img/icon.svg');
    expect(thumb('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
    expect(thumb('/assets/audio/cover.jpg')).toBe('/assets/audio/cover.jpg');
    expect(thumb(undefined)).toBeUndefined();
  });
});
