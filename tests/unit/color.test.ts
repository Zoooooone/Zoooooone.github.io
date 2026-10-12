import { describe, expect, it } from 'vitest';
import { contrast, ensureContrast, formatHsl, hslToRgb, luminance, over, parseHsl, type Rgb } from '@/lib/theme/color';

describe('hsl parsing and formatting', () => {
  it('round-trips colors with and without alpha', () => {
    expect(parseHsl('hsl(215 14% 8%)')).toEqual({ h: 215, s: 14, l: 8, a: 1 });
    expect(parseHsl('hsl(42 4% 7% / 0.75)')).toEqual({ h: 42, s: 4, l: 7, a: 0.75 });
    expect(formatHsl({ h: 215, s: 14, l: 8, a: 1 })).toBe('hsl(215 14% 8%)');
    expect(formatHsl({ h: 42, s: 4, l: 7, a: 0.75 })).toBe('hsl(42 4% 7% / 0.75)');
  });

  it('rejects anything that is not an hsl() color', () => {
    expect(() => parseHsl('#ffffff')).toThrow(/Cannot parse color/);
  });
});

describe('color math', () => {
  it('converts the primary colors', () => {
    expect(hslToRgb({ h: 0, s: 100, l: 50, a: 1 }).map(Math.round)).toEqual([255, 0, 0]);
    expect(hslToRgb({ h: 120, s: 100, l: 50, a: 1 }).map(Math.round)).toEqual([0, 255, 0]);
    expect(hslToRgb({ h: 0, s: 0, l: 100, a: 1 }).map(Math.round)).toEqual([255, 255, 255]);
  });

  it('computes WCAG contrast', () => {
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrast([255, 255, 255], [255, 255, 255])).toBeCloseTo(1, 5);
    expect(contrast([20, 20, 20], [200, 200, 200])).toBeCloseTo(contrast([200, 200, 200], [20, 20, 20]), 10);
    expect(luminance([0, 0, 0])).toBe(0);
  });

  it('composites a translucent foreground over a background', () => {
    expect(over([255, 255, 255], 0.5, [0, 0, 0])).toEqual([127.5, 127.5, 127.5]);
    expect(over([10, 20, 30], 1, [200, 200, 200])).toEqual([10, 20, 30]);
  });
});

describe('ensureContrast', () => {
  const darkBg: Rgb = [20, 22, 26];
  const lightBg: Rgb = [245, 244, 240];

  it('leaves compliant colors untouched', () => {
    const fg = { h: 210, s: 20, l: 90, a: 1 };
    expect(ensureContrast(fg, [darkBg], 4.5)).toEqual(fg);
  });

  it('lightens text on dark backgrounds until the target is met, keeping hue and saturation', () => {
    const fg = { h: 210, s: 30, l: 25, a: 1 };
    const out = ensureContrast(fg, [darkBg], 4.5);
    expect(out.l).toBeGreaterThan(fg.l);
    expect(out.h).toBe(fg.h);
    expect(out.s).toBe(fg.s);
    expect(contrast(hslToRgb(out), darkBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('darkens text on light backgrounds', () => {
    const fg = { h: 30, s: 40, l: 80, a: 1 };
    const out = ensureContrast(fg, [lightBg], 4.5);
    expect(out.l).toBeLessThan(fg.l);
    expect(contrast(hslToRgb(out), lightBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('satisfies every background at once', () => {
    const second: Rgb = [60, 62, 70];
    const out = ensureContrast({ h: 0, s: 0, l: 50, a: 1 }, [darkBg, second], 4.5);
    for (const bg of [darkBg, second]) {
      expect(contrast(hslToRgb(out), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
