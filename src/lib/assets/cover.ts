import { join } from 'node:path';
import sharp from 'sharp';

export type CoverFit = 'cover' | 'contain';
export type CoverLayout = {
  fit: CoverFit;
};

const FALLBACK: CoverLayout = { fit: 'cover' };
/** Below this width an image is treated as a graphic: cropping or upscaling it would look poor */
const PHOTO_MIN_WIDTH = 1200;
/** Distinct 5-bit colors in a 256px copy: flat graphics (logos, UI screenshots) stay well under this, photos exceed it */
const PHOTO_MIN_COLORS = 600;
const SAMPLE_WIDTH = 256;

const cache = new Map<string, Promise<CoverFit>>();

async function detect(file: string): Promise<CoverFit> {
  const image = sharp(file);
  const { width, hasAlpha } = await image.metadata();
  if (!width || hasAlpha || width < PHOTO_MIN_WIDTH) return 'contain';
  const { data } = await image.resize(SAMPLE_WIDTH).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const colors = new Set<number>();
  for (let i = 0; i < data.length; i += 3)
    colors.add(((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3));
  return colors.size < PHOTO_MIN_COLORS ? 'contain' : 'cover';
}

export async function coverLayout(src: string | undefined, override?: CoverFit): Promise<CoverLayout> {
  if (override) return { fit: override };
  if (!src?.startsWith('/')) return FALLBACK;
  let hit = cache.get(src);
  if (!hit) {
    hit = detect(join(process.cwd(), 'public', src)).catch(() => FALLBACK.fit);
    cache.set(src, hit);
  }
  return { fit: await hit };
}
