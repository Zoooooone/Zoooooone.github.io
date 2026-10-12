import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { coverLayout } from '@/lib/assets/cover';

let root: string;

/** A smooth multi-hue gradient: many distinct colors that survive downscaling, like a photograph. */
const photoLike = (w: number, h: number, channels: 3 | 4 = 3) => {
  const data = Buffer.alloc(w * h * channels);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * channels;
      data[i] = (x * 255) / w;
      data[i + 1] = (y * 255) / h;
      data[i + 2] = (x * y * 255) / (w * h);
      if (channels === 4) data[i + 3] = 255;
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels } });
};

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'cover-'));
  mkdirSync(join(root, 'public'));
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  const out = (name: string) => join(root, 'public', name);

  await photoLike(1600, 900).png().toFile(out('photo.png'));
  await photoLike(800, 600).png().toFile(out('small.png'));
  await photoLike(1600, 900, 4).png().toFile(out('alpha.png'));
  await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#2a6df4' } })
    .png()
    .toFile(out('flat.png'));
});

afterAll(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

describe('coverLayout', () => {
  it('fills the frame for photographs', async () => {
    expect(await coverLayout('/photo.png')).toEqual({ fit: 'cover' });
  });

  it('shows graphics whole: small, transparent or flat-color images', async () => {
    expect(await coverLayout('/small.png')).toEqual({ fit: 'contain' });
    expect(await coverLayout('/alpha.png')).toEqual({ fit: 'contain' });
    expect(await coverLayout('/flat.png')).toEqual({ fit: 'contain' });
  });

  it('lets front matter override the detection', async () => {
    expect(await coverLayout('/flat.png', 'cover')).toEqual({ fit: 'cover' });
    expect(await coverLayout('/photo.png', 'contain')).toEqual({ fit: 'contain' });
  });

  it('falls back to cover for remote, missing and unreadable images', async () => {
    expect(await coverLayout(undefined)).toEqual({ fit: 'cover' });
    expect(await coverLayout('https://example.com/a.jpg')).toEqual({ fit: 'cover' });
    expect(await coverLayout('/does-not-exist.png')).toEqual({ fit: 'cover' });
  });
});
