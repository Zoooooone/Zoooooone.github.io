import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Hct, argbFromRgb } from '@material/material-color-utilities';
import { describe, expect, it } from 'vitest';
import { backgrounds } from '@/config';
import { contrast, parseColor, type Rgb } from '@/lib/theme/color';
import {
  CONTRAST_MIN,
  SHEET_ALPHA,
  percentile,
  solidTheme,
  surfaceLayers,
  wallpaperTheme,
  type WallpaperTheme,
} from '@/lib/theme/palette';

const KEYS = [
  'accent',
  'accent-soft',
  'bg',
  'veil',
  'glass',
  'glass-strong',
  'card',
  'border',
  'border-strong',
  'fg',
  'fg-muted',
  'fg-faint',
  'code-bg',
];

const chromaOf = (value: string) => {
  const { rgb } = parseColor(value);
  return Hct.fromInt(argbFromRgb(...rgb)).chroma;
};

function expectComplete(theme: WallpaperTheme) {
  for (const mode of ['light', 'dark'] as const) {
    expect(Object.keys(theme[mode]).sort()).toEqual([...KEYS].sort());
    for (const key of KEYS) expect(() => parseColor(theme[mode][key])).not.toThrow();
  }
}

function expectReadable(theme: WallpaperTheme, layersOf: (mode: 'light' | 'dark') => Promise<Rgb[]> | Rgb[]) {
  return Promise.all(
    (['light', 'dark'] as const).map(async (mode) => {
      const layers = await layersOf(mode);
      for (const [key, min] of Object.entries(CONTRAST_MIN)) {
        const { rgb } = parseColor(theme[mode][key]);
        for (const layer of layers) {
          expect(contrast(rgb, layer), `${mode} ${key}`).toBeGreaterThanOrEqual(min);
        }
      }
    }),
  );
}

describe('sheet opacity', () => {
  it('matches the --sheet-alpha tokens in CSS (light first, then dark)', () => {
    const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');
    const values = [...css.matchAll(/--sheet-alpha:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    expect(values).toEqual([SHEET_ALPHA.light, SHEET_ALPHA.dark]);
  });
});

describe('contrast thresholds', () => {
  it('require 4.5:1 for text and accent, and 3:1 for auxiliary text', () => {
    expect(CONTRAST_MIN).toEqual({ fg: 4.5, 'fg-muted': 4.5, 'fg-faint': 3, accent: 4.5 });
  });
});

describe('default theme', () => {
  it('is the first entry and a plain color without a wallpaper', () => {
    expect(backgrounds[0].src).toBeNull();
  });

  it('has opaque surfaces and a nearly gray palette', () => {
    const theme = solidTheme(backgrounds[0].id, backgrounds[0].tone);
    expectComplete(theme);
    for (const mode of ['light', 'dark'] as const) {
      for (const key of ['glass', 'glass-strong', 'card', 'code-bg']) {
        expect(parseColor(theme[mode][key]).a).toBe(1);
      }
      for (const key of ['bg', 'card', 'fg']) expect(chromaOf(theme[mode][key])).toBeLessThanOrEqual(4);
    }
  });

  it('is readable in both modes', async () => {
    const theme = solidTheme(backgrounds[0].id, backgrounds[0].tone);
    await expectReadable(theme, (mode) => surfaceLayers(theme[mode], parseColor(theme[mode].bg).rgb, 1, true));
  });
});

describe('wallpaper palettes', () => {
  const withImage = backgrounds.filter((b) => b.src);

  it.each(withImage.map((b) => [b.id, b] as const))('%s is complete and readable on its own image', async (_id, b) => {
    const theme = await wallpaperTheme(b.src!, b.tone);
    expectComplete(theme);
    const file = join(process.cwd(), 'public', b.src!.replace(/^\//, ''));
    await expectReadable(theme, async (mode) =>
      surfaceLayers(theme[mode], await percentile(file, mode === 'light' ? 0.05 : 0.95), SHEET_ALPHA[mode]),
    );
  });

  it('keeps surfaces nearly gray for black-and-white wallpapers', async () => {
    const mono = withImage.find((b) => b.tone?.neutral);
    if (!mono) return;
    const theme = await wallpaperTheme(mono.src!, mono.tone);
    for (const key of ['bg', 'card', 'fg', 'fg-muted']) {
      expect(chromaOf(theme.dark[key])).toBeLessThanOrEqual(4);
    }
  });

  it('is deterministic', async () => {
    const b = withImage[0];
    expect(await wallpaperTheme(b.src!, b.tone)).toEqual(await wallpaperTheme(b.src!, b.tone));
  });
});
