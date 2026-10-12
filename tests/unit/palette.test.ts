import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { backgrounds } from '@/config';
import { parseHsl } from '@/lib/theme/color';
import { CONTRAST_MIN, SHEET_ALPHA, wallpaperTheme } from '@/lib/theme/palette';

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

describe('wallpaper palettes', () => {
  const withImage = backgrounds.filter((b) => b.src);

  it.each(withImage.map((b) => [b.id, b] as const))('%s yields a complete, parseable palette', async (_id, b) => {
    const theme = await wallpaperTheme(b.src!, b.tone);
    for (const mode of ['light', 'dark'] as const) {
      expect(Object.keys(theme[mode]).sort()).toEqual([...KEYS].sort());
      for (const key of KEYS) expect(() => parseHsl(theme[mode][key])).not.toThrow();
    }
  });

  it('keeps surfaces nearly gray for black-and-white wallpapers', async () => {
    const mono = withImage.find((b) => b.tone?.neutral);
    if (!mono) return;
    const theme = await wallpaperTheme(mono.src!, mono.tone);
    for (const key of ['bg', 'card', 'fg', 'fg-muted']) {
      expect(parseHsl(theme.dark[key]).s).toBeLessThanOrEqual(10);
    }
  });

  it('is deterministic', async () => {
    const b = withImage[0];
    expect(await wallpaperTheme(b.src!, b.tone)).toEqual(await wallpaperTheme(b.src!, b.tone));
  });
});
