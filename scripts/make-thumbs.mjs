import { mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'public', 'assets');
const out = join(assets, 'thumbs');
const SOURCES = ['img', 'src'];
const WIDTHS = [800, 1600];
const WALLPAPER_DIR = 'img/wallpapers/';
const WALLPAPER_WIDTH = 2560;
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const mtime = async (p) => {
  try {
    return (await stat(p)).mtimeMs;
  } catch {
    return 0;
  }
};

let made = 0;
let skipped = 0;
let failed = 0;
const jobs = [];

for (const s of SOURCES) {
  const base = join(assets, s);
  for await (const file of walk(base)) {
    const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
    if (!EXT.has(ext)) continue;
    const rel = relative(assets, file);
    const srcTime = await mtime(file);
    const isWallpaper = rel.replaceAll('\\', '/').startsWith(WALLPAPER_DIR);
    for (const w of isWallpaper ? [...WIDTHS, WALLPAPER_WIDTH] : WIDTHS) {
      const dest = join(out, String(w), `${rel}.webp`);
      if ((await mtime(dest)) >= srcTime) {
        skipped++;
        continue;
      }
      jobs.push({ file, dest, w });
    }
  }
}

const limit = 6;
let i = 0;
await Promise.all(
  Array.from({ length: limit }, async () => {
    while (i < jobs.length) {
      const { file, dest, w } = jobs[i++];
      try {
        await mkdir(dirname(dest), { recursive: true });
        await sharp(file)
          .rotate()
          .resize(
            w === WALLPAPER_WIDTH
              ? { width: WALLPAPER_WIDTH, height: 1440, fit: 'outside', withoutEnlargement: true }
              : { width: w, withoutEnlargement: true },
          )
          .webp({ quality: w === WALLPAPER_WIDTH ? 88 : 78 })
          .toFile(dest);
        made++;
      } catch (err) {
        failed++;
        console.warn(`[thumbs] skip ${relative(root, file)}: ${err.message}`);
      }
    }
  }),
);

console.log(`[thumbs] generated ${made}, up-to-date ${skipped}${failed ? `, failed ${failed}` : ''}`);
