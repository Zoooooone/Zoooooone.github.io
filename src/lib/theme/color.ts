export type Rgb = [number, number, number];
export type Hsl = { h: number; s: number; l: number; a: number };

export function parseHsl(value: string): Hsl {
  const m = value.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+))?\s*\)/);
  if (!m) throw new Error(`Cannot parse color: ${value}`);
  return { h: +m[1], s: +m[2], l: +m[3], a: m[4] === undefined ? 1 : +m[4] };
}

export function formatHsl({ h, s, l, a }: Hsl): string {
  const num = (n: number) => String(Math.round(n * 10) / 10);
  return `hsl(${num(h)} ${num(s)}% ${num(l)}%${a < 1 ? ` / ${Math.round(a * 100) / 100}` : ''})`;
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const S = s / 100;
  const L = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

export function over(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha)) as Rgb;
}

export function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function ensureContrast(fg: Hsl, backgrounds: Rgb[], min: number): Hsl {
  const worst = (l: number) => Math.min(...backgrounds.map((bg) => contrast(hslToRgb({ ...fg, l }), bg)));
  if (worst(fg.l) >= min) return fg;

  const avg = backgrounds.reduce((s, bg) => s + luminance(bg), 0) / backgrounds.length;
  const dir = avg > 0.4 ? -1 : 1;
  let l = fg.l;
  while (l > 0 && l < 100 && worst(l) < min) l += dir * 0.5;
  l = Math.max(0, Math.min(100, l));
  return { ...fg, l };
}
