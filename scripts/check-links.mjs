import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix, resolve, sep } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist');
if (!existsSync(dist)) {
  console.error(`dist not found: ${dist} (run the build first)`);
  process.exit(1);
}

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const pages = walk(dist).filter((f) => f.endsWith('.html'));
const idCache = new Map();
const idsOf = (file) => {
  if (!idCache.has(file)) {
    const html = readFileSync(file, 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
};

const toFile = (pathname) => {
  const clean = decodeURIComponent(pathname);
  const candidates = [clean, posix.join(clean, 'index.html'), `${clean}.html`];
  for (const c of candidates) {
    const f = join(dist, c);
    if (existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
};

const broken = [];
let checked = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const pagePath =
    '/' +
    page
      .slice(dist.length + 1)
      .split(sep)
      .join('/');
  const base = pagePath.endsWith('index.html') ? pagePath.slice(0, -'index.html'.length) : pagePath;
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const raw = m[1];
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|data:|javascript:)/i.test(raw)) continue;
    const url = new URL(raw, `http://x${base}`);
    checked++;
    const file = toFile(url.pathname);
    if (!file) {
      broken.push(`${pagePath}  ->  ${raw}  (missing file)`);
      continue;
    }
    if (url.hash.length > 1 && file.endsWith('.html')) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!idsOf(file).has(id)) broken.push(`${pagePath}  ->  ${raw}  (missing #${id})`);
    }
  }
}

console.log(`checked ${checked} internal references in ${pages.length} pages`);
if (broken.length) {
  const unique = [...new Set(broken)];
  console.error(`\n${unique.length} broken reference(s):`);
  unique.slice(0, 50).forEach((b) => console.error('  ' + b));
  process.exit(1);
}
console.log('no broken internal links');
