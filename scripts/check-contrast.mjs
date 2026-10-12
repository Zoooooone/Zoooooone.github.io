import { join } from 'node:path';
import sharp from 'sharp';
import { backgrounds } from '../src/config/backgrounds.ts';
import { CONTRAST_MIN, SHEET_ALPHA, adjustments, surfaceLayers, wallpaperTheme } from '../src/lib/theme/palette.ts';
import { contrast, hslToRgb, parseHsl, luminance } from '../src/lib/theme/color.ts';

const LABEL = { fg: '正文', 'fg-muted': '次要文字', 'fg-faint': '辅助文字', accent: '强调色' };

async function sample(file, pick) {
  const { data } = await sharp(file)
    .resize(64, 64, { fit: 'cover' })
    .blur(0.5)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < data.length; i += 3) px.push([data[i], data[i + 1], data[i + 2]]);
  px.sort((a, b) => luminance(a) - luminance(b));
  return px[Math.min(px.length - 1, Math.max(0, Math.round(px.length * pick)))];
}

const rows = [];
for (const bg of backgrounds) {
  if (!bg.src) continue;
  const t = await wallpaperTheme(bg.src, bg.tone);
  for (const mode of ['light', 'dark']) {
    const file = join(process.cwd(), 'public', bg.src.replace(/^\//, ''));
    const layers = surfaceLayers(t[mode], await sample(file, mode === 'light' ? 0.05 : 0.95), SHEET_ALPHA[mode]);
    for (const [key, min] of Object.entries(CONTRAST_MIN)) {
      const rgb = hslToRgb(parseHsl(t[mode][key]));
      const ratio = Math.min(...layers.map((l) => contrast(rgb, l)));
      rows.push({ bg: bg.id, mode, name: LABEL[key], ratio, min, ok: ratio >= min });
    }
  }
}
{
  const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const mix = (c, a, under) => c.map((v, i) => v * a + under[i] * (1 - a));
  const plain = {
    light: {
      bg: '#f6f1e9',
      strong: [[255, 251, 244], 0.84],
      card: [[255, 253, 249], 0.78],
      fg: '#2a241e',
      'fg-muted': '#75685b',
      'fg-faint': '#8f8376',
      accent: '#b8562f',
    },
    dark: {
      bg: '#181411',
      strong: [[28, 22, 18], 0.82],
      card: [[46, 38, 31], 0.62],
      fg: '#ece3d6',
      'fg-muted': '#a99d8e',
      'fg-faint': '#75695d',
      accent: '#e9945f',
    },
  };
  for (const mode of ['light', 'dark']) {
    const p = plain[mode];
    const sheet = mix(p.strong[0], p.strong[1], hex(p.bg));
    const layers = [sheet, mix(p.card[0], p.card[1], sheet)];
    for (const [key, min] of Object.entries(CONTRAST_MIN)) {
      const ratio = Math.min(...layers.map((l) => contrast(hex(p[key]), l)));
      rows.push({ bg: 'plain', mode, name: LABEL[key], ratio, min, ok: ratio >= min });
    }
  }
}
const fail = rows.filter((r) => !r.ok).length;
const byKey = new Map();
for (const r of rows) {
  const k = `${r.bg} / ${r.mode}`;
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(r);
}
for (const [k, list] of byKey) {
  console.log(k.padEnd(26) + list.map((r) => `${r.name} ${r.ratio.toFixed(2)}${r.ok ? '' : '✗'}`).join('  '));
}
if (adjustments.length) {
  console.log('\n自动调整（仅改明度，色相不变）：');
  for (const a of adjustments) {
    const file = a.src.split('/').pop();
    console.log(`  ${file} / ${a.mode} / ${a.key}：明度 ${a.from.toFixed(1)}% → ${a.to.toFixed(1)}%`);
  }
}
console.log(fail ? `\n${fail} 项低于阈值` : '\n全部达标');
process.exit(fail ? 1 : 0);
