import { describe, expect, it } from 'vitest';
import { contrast, formatColor, luminance, over, parseColor } from '@/lib/theme/color';

describe('color parsing and formatting', () => {
  it('round-trips opaque colors as hex and translucent ones as rgb()', () => {
    expect(parseColor('#1a2b3c')).toEqual({ rgb: [26, 43, 60], a: 1 });
    expect(parseColor('rgb(10 20 30 / 0.75)')).toEqual({ rgb: [10, 20, 30], a: 0.75 });
    expect(formatColor([26, 43, 60])).toBe('#1a2b3c');
    expect(formatColor([10, 20, 30], 0.75)).toBe('rgb(10 20 30 / 0.75)');
  });

  it('clamps and rounds channels', () => {
    expect(formatColor([-4, 255.4, 300])).toBe('#00ffff');
  });

  it('rejects anything it did not write', () => {
    expect(() => parseColor('hsl(0 0% 0%)')).toThrow(/Cannot parse color/);
  });
});

describe('color math', () => {
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
