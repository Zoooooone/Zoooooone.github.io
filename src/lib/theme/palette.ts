import { join } from 'node:path';
import {
  Hct,
  QuantizerCelebi,
  Score,
  TonalPalette,
  argbFromRgb,
  blueFromArgb,
  greenFromArgb,
  redFromArgb,
} from '@material/material-color-utilities';
import sharp from 'sharp';
import { contrast, formatColor, over, parseColor, type Rgb } from './color.ts';

export type WallpaperTheme = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

export type Tone = {
  hue?: number;
  chroma?: number;
  neutral?: boolean;
};

type Mode = 'light' | 'dark';

/** Must match --sheet-alpha in styles/tokens.css. */
export const SHEET_ALPHA = { light: 0.66, dark: 0.6 } as const;

/** Minimum contrast (WCAG): 4.5 for body text; 3 for auxiliary text (indices, ticks, numbers) */
export const CONTRAST_MIN: Record<string, number> = { fg: 4.5, 'fg-muted': 4.5, 'fg-faint': 3, accent: 4.5 };

const NEUTRAL_HUE = 215;
const ACCENT_CHROMA = { min: 28, max: 52, neutral: 14 };
const SURFACE_CHROMA = { tinted: 6, neutral: 1.5 };
const VARIANT_CHROMA = { tinted: 8, neutral: 2 };

/** HCT tones per role. Contrast depends only on tone, so these clear the thresholds by construction; `enforce` handles busy wallpapers. */
const TONES = {
  light: { bg: 95, glass: 98, strong: 97, card: 99, code: 97, fg: 10, muted: 35, faint: 50, accent: 40, line: 30 },
  dark: { bg: 8, glass: 15, strong: 10, card: 18, code: 6, fg: 90, muted: 70, faint: 55, accent: 75, line: 80 },
} as const;

const ALPHA = {
  light: { veil: 0.18, glass: 0.62, strong: 0.82, card: 0.74, code: 0.8, border: 0.12, borderStrong: 0.22, soft: 0.12 },
  dark: { veil: 0.28, glass: 0.55, strong: 0.82, card: 0.6, code: 0.75, border: 0.09, borderStrong: 0.18, soft: 0.16 },
} as const;

type Palettes = { surface: TonalPalette; variant: TonalPalette; accent: TonalPalette };

const rgbOf = (argb: number): Rgb => [redFromArgb(argb), greenFromArgb(argb), blueFromArgb(argb)];

function build(mode: Mode, p: Palettes, opaque: boolean): Record<string, string> {
  const t = TONES[mode];
  const a = opaque ? { ...ALPHA[mode], veil: 0, glass: 1, strong: 1, card: 1, code: 1 } : ALPHA[mode];
  const surface = (tone: number, alpha = 1) => formatColor(rgbOf(p.surface.tone(tone)), alpha);
  const variant = (tone: number, alpha = 1) => formatColor(rgbOf(p.variant.tone(tone)), alpha);
  const accent = (alpha = 1) => formatColor(rgbOf(p.accent.tone(t.accent)), alpha);
  return {
    accent: accent(),
    'accent-soft': accent(a.soft),
    bg: surface(t.bg),
    veil: surface(t.bg, a.veil),
    glass: surface(t.glass, a.glass),
    'glass-strong': surface(t.strong, a.strong),
    card: surface(t.card, a.card),
    border: variant(t.line, a.border),
    'border-strong': variant(t.line, a.borderStrong),
    fg: surface(t.fg),
    'fg-muted': variant(t.muted),
    'fg-faint': variant(t.faint),
    'code-bg': surface(t.code, a.code),
  };
}

/** Colors that text actually sits on: the sheet over the wallpaper pixel, and a card on top of it. */
export function surfaceLayers(
  theme: Record<string, string>,
  wallpaperPixel: Rgb,
  sheetAlpha: number,
  solid = false,
): Rgb[] {
  const layer = (key: string, under: Rgb): Rgb => {
    const { rgb, a } = parseColor(theme[key]);
    return over(rgb, a, under);
  };
  const base = parseColor(theme.bg).rgb;
  const sheet = solid ? layer('glass-strong', base) : over(base, sheetAlpha, layer('veil', wallpaperPixel));
  return [sheet, layer('card', sheet)];
}

const worstContrast = (rgb: Rgb, layers: Rgb[]) => Math.min(...layers.map((l) => contrast(rgb, l)));

/** Moves the tone away from the surfaces (darker in light mode, lighter in dark mode) until the contrast is met. */
function toneFor(palette: TonalPalette, base: number, layers: Rgb[], min: number, mode: Mode): number {
  const step = mode === 'light' ? -0.5 : 0.5;
  let tone = base;
  while (tone > 0 && tone < 100 && worstContrast(rgbOf(palette.tone(tone)), layers) < min) tone += step;
  return tone;
}

function enforce(mode: Mode, theme: Record<string, string>, p: Palettes, layers: Rgb[]) {
  const t = TONES[mode];
  const roles: [string, TonalPalette, number][] = [
    ['fg', p.surface, t.fg],
    ['fg-muted', p.variant, t.muted],
    ['fg-faint', p.variant, t.faint],
    ['accent', p.accent, t.accent],
  ];
  for (const [key, palette, base] of roles) {
    const tone = toneFor(palette, base, layers, CONTRAST_MIN[key], mode);
    if (tone === base) continue;
    theme[key] = formatColor(rgbOf(palette.tone(tone)));
    if (key === 'accent') theme['accent-soft'] = formatColor(rgbOf(palette.tone(tone)), ALPHA[mode].soft);
  }
}

function palettes(hue: number, chroma: number, neutral: boolean): Palettes {
  const k = neutral ? 'neutral' : 'tinted';
  return {
    surface: TonalPalette.fromHueAndChroma(hue, SURFACE_CHROMA[k]),
    variant: TonalPalette.fromHueAndChroma(hue, VARIANT_CHROMA[k]),
    accent: TonalPalette.fromHueAndChroma(hue, chroma),
  };
}

const cache = new Map<string, WallpaperTheme>();

type Seed = { hue: number; chroma: number };

/** The best theme color of the image, or null when it has no usable color (grayscale). */
async function seedOf(file: string): Promise<Seed | null> {
  const { data } = await sharp(file)
    .resize(96, 96, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const argbs: number[] = [];
  for (let i = 0; i < data.length; i += 3) argbs.push(argbFromRgb(data[i], data[i + 1], data[i + 2]));
  const [best] = Score.score(QuantizerCelebi.quantize(argbs, 128), { desired: 1, fallbackColorARGB: 0, filter: true });
  if (!best) return null;
  const hct = Hct.fromInt(best);
  return { hue: hct.hue, chroma: hct.chroma };
}

/** The wallpaper pixel at the given lightness percentile, which the translucent sheet is checked against. */
export async function percentile(file: string, pick: number): Promise<Rgb> {
  const { data } = await sharp(file)
    .resize(64, 64, { fit: 'cover' })
    .blur(0.5)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px: { rgb: Rgb; tone: number }[] = [];
  for (let i = 0; i < data.length; i += 3) {
    const rgb: Rgb = [data[i], data[i + 1], data[i + 2]];
    px.push({ rgb, tone: Hct.fromInt(argbFromRgb(...rgb)).tone });
  }
  px.sort((a, b) => a.tone - b.tone);
  return px[Math.min(px.length - 1, Math.max(0, Math.round(px.length * pick)))].rgb;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export async function wallpaperTheme(src: string, tone: Tone = {}): Promise<WallpaperTheme> {
  const hit = cache.get(src);
  if (hit) return hit;

  const file = join(process.cwd(), 'public', src.replace(/^\//, ''));
  const seed = await seedOf(file);
  const neutral = tone.neutral ?? seed === null;
  const hue = Math.round(tone.hue ?? seed?.hue ?? NEUTRAL_HUE);
  const chroma =
    tone.chroma ?? (neutral ? ACCENT_CHROMA.neutral : clamp(seed!.chroma, ACCENT_CHROMA.min, ACCENT_CHROMA.max));
  const p = palettes(hue, chroma, neutral);

  const light = build('light', p, false);
  const dark = build('dark', p, false);
  enforce('light', light, p, surfaceLayers(light, await percentile(file, 0.05), SHEET_ALPHA.light));
  enforce('dark', dark, p, surfaceLayers(dark, await percentile(file, 0.95), SHEET_ALPHA.dark));

  const theme = { light, dark };
  cache.set(src, theme);
  return theme;
}

/** A plain-color theme without a wallpaper: every surface is opaque, so only the sheet and the card matter. */
export function solidTheme(id: string, tone: Tone = {}): WallpaperTheme {
  const hit = cache.get(id);
  if (hit) return hit;

  const p = palettes(tone.hue ?? NEUTRAL_HUE, tone.chroma ?? ACCENT_CHROMA.neutral, tone.neutral ?? true);
  const light = build('light', p, true);
  const dark = build('dark', p, true);
  enforce('light', light, p, surfaceLayers(light, parseColor(light.bg).rgb, 1, true));
  enforce('dark', dark, p, surfaceLayers(dark, parseColor(dark.bg).rgb, 1, true));

  const theme = { light, dark };
  cache.set(id, theme);
  return theme;
}
