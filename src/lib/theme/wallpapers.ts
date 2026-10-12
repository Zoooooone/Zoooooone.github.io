import { backgrounds, type Background } from '@/config';
import { thumb } from '@/lib/assets/thumb';
import { wallpaperTheme, type WallpaperTheme } from './palette';

export type Wallpaper = Omit<Background, 'src'> & { src: string | null; theme: WallpaperTheme | null };

export function loadWallpapers(): Promise<Wallpaper[]> {
  return Promise.all(
    backgrounds.map(async (b) => ({
      ...b,
      src: b.src ? (thumb(b.src, 2560) ?? b.src) : null,
      theme: b.src ? await wallpaperTheme(b.src, b.tone) : null,
    })),
  );
}
