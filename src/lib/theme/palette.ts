import { join } from 'node:path';
import sharp from 'sharp';
import { ensureContrast, formatHsl, hslToRgb, luminance, over, parseHsl, type Rgb } from './color.ts';

export type WallpaperTheme = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

const cache = new Map<string, WallpaperTheme>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

async function dominant(file: string): Promise<{ hue: number; sat: number; achromatic: boolean }> {
  const { data } = await sharp(file)
    .resize(64, 64, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const BINS = 24;
  const weight = new Array<number>(BINS).fill(0);
  const satSum = new Array<number>(BINS).fill(0);
  const hueSum = new Array<number>(BINS).fill(0);

  for (let i = 0; i < data.length; i += 3) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (l < 0.12 || l > 0.9) continue;
    const w = s * s * (1 - Math.abs(2 * l - 1));
    const bin = Math.floor((h / 360) * BINS) % BINS;
    weight[bin] += w;
    satSum[bin] += s * w;
    hueSum[bin] += h * w;
  }

  let best = 0;
  for (let i = 1; i < BINS; i++) if (weight[i] > weight[best]) best = i;
  // Almost no colored pixels: a black-and-white or grayscale image has no hue to extract and none may be invented.
  // Falling back to warm orange here once produced a fully brown UI for a pure black wallpaper.
  const total = weight.reduce((a, b) => a + b, 0);
  const achromatic = total < 0.01 * (data.length / 3);
  if (weight[best] === 0) return { hue: 215, sat: 0.14, achromatic: true };
  return { hue: hueSum[best] / weight[best], sat: satSum[best] / weight[best], achromatic };
}

async function percentile(file: string, pick: number): Promise<Rgb> {
  const { data } = await sharp(file)
    .resize(64, 64, { fit: 'cover' })
    .blur(0.5)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px: Rgb[] = [];
  for (let i = 0; i < data.length; i += 3) px.push([data[i], data[i + 1], data[i + 2]]);
  px.sort((a, b) => luminance(a) - luminance(b));
  return px[Math.min(px.length - 1, Math.max(0, Math.round(px.length * pick)))];
}

/** Must match --sheet-alpha in styles/tokens.css. */
export const SHEET_ALPHA = { light: 0.66, dark: 0.6 } as const;

export function surfaceLayers(theme: Record<string, string>, wallpaperPixel: Rgb, sheetAlpha: number): Rgb[] {
  const layer = (key: string, under: Rgb): Rgb => {
    const c = parseHsl(theme[key]);
    return over(hslToRgb(c), c.a, under);
  };
  const base = hslToRgb(parseHsl(theme.bg));
  const sheet = over(base, sheetAlpha, layer('veil', wallpaperPixel));
  return [sheet, layer('card', sheet)];
}

/** Minimum contrast (WCAG): 4.5 for body text; 3 for auxiliary text (indices, ticks, numbers) */
export const CONTRAST_MIN: Record<string, number> = { fg: 4.5, 'fg-muted': 4.5, 'fg-faint': 3, accent: 4.5 };

export const adjustments: { src: string; mode: 'light' | 'dark'; key: string; from: number; to: number }[] = [];

function enforce(src: string, mode: 'light' | 'dark', theme: Record<string, string>, pixel: Rgb) {
  const layers = surfaceLayers(theme, pixel, SHEET_ALPHA[mode]);
  for (const [key, min] of Object.entries(CONTRAST_MIN)) {
    const before = parseHsl(theme[key]);
    const after = ensureContrast(before, layers, min);
    if (after.l === before.l) continue;
    theme[key] = formatHsl(after);
    adjustments.push({ src, mode, key, from: before.l, to: after.l });
    if (key === 'accent') theme['accent-soft'] = formatHsl({ ...after, a: parseHsl(theme['accent-soft']).a });
  }
}

export type Tone = {
  hue?: number;
  sat?: number;
  neutral?: boolean;
};

export async function wallpaperTheme(src: string, tone: Tone = {}): Promise<WallpaperTheme> {
  const hit = cache.get(src);
  if (hit) return hit;

  const file = join(process.cwd(), 'public', src.replace(/^\//, ''));
  const found = await dominant(file);
  const neutral = tone.neutral ?? found.achromatic;
  const h = Math.round(tone.hue ?? found.hue);
  const s = Math.round(
    tone.sat ?? (found.achromatic ? found.sat * 100 : Math.min(0.72, Math.max(0.42, found.sat)) * 100),
  );

  const st = neutral ? 5 : Math.round(Math.min(46, Math.max(22, s * 0.6)));
  const da = Math.min(s + 8, 80);

  const k = neutral ? 0.18 : 1;
  const c = (n: number) => Math.round(n * k);

  const theme: WallpaperTheme = {
    light: {
      accent: `hsl(${h} ${s}% 42%)`,
      'accent-soft': `hsl(${h} ${s}% 42% / 0.12)`,
      bg: `hsl(${h} ${st}% 94%)`,
      veil: `hsl(${h} ${st}% 94% / 0.18)`,
      glass: `hsl(${h} ${st + c(6)}% 97% / 0.62)`,
      'glass-strong': `hsl(${h} ${st + c(4)}% 96% / 0.82)`,
      card: `hsl(${h} ${st + c(6)}% 98% / 0.74)`,
      border: `hsl(${h} ${c(28)}% 28% / 0.12)`,
      'border-strong': `hsl(${h} ${c(28)}% 28% / 0.22)`,
      fg: `hsl(${h} ${c(30)}% 13%)`,
      'fg-muted': `hsl(${h} ${c(14)}% 38%)`,
      'fg-faint': `hsl(${h} ${c(10)}% 58%)`,
      'code-bg': `hsl(${h} ${st + c(6)}% 97% / 0.8)`,
    },
    dark: {
      accent: `hsl(${h} ${da}% 68%)`,
      'accent-soft': `hsl(${h} ${da}% 68% / 0.16)`,
      bg: `hsl(${h} ${c(26)}% 8%)`,
      veil: `hsl(${h} ${c(26)}% 7% / 0.28)`,
      glass: `hsl(${h} ${c(22)}% 15% / 0.55)`,
      'glass-strong': `hsl(${h} ${c(24)}% 10% / 0.82)`,
      card: `hsl(${h} ${c(22)}% 18% / 0.6)`,
      border: `hsl(${h} ${c(40)}% 82% / 0.09)`,
      'border-strong': `hsl(${h} ${c(40)}% 82% / 0.18)`,
      fg: `hsl(${h} ${c(28)}% 90%)`,
      'fg-muted': `hsl(${h} ${c(12)}% 68%)`,
      'fg-faint': `hsl(${h} ${c(9)}% 48%)`,
      'code-bg': `hsl(${h} ${c(24)}% 7% / 0.75)`,
    },
  };
  enforce(src, 'light', theme.light, await percentile(file, 0.05));
  enforce(src, 'dark', theme.dark, await percentile(file, 0.95));

  cache.set(src, theme);
  return theme;
}
