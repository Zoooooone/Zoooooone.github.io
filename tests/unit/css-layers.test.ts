import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../src/styles/${path}`, import.meta.url), 'utf8');
const layerList = read('layers.css')
  .match(/@layer ([^;]+);/)![1]
  .split(',')
  .map((s) => s.trim());

describe('cascade layers', () => {
  it('declares every layer once in layers.css', () => {
    expect(layerList.length).toBeGreaterThan(5);
    expect(new Set(layerList).size).toBe(layerList.length);
  });

  it('starts every layered stylesheet with that declaration', () => {
    for (const file of ['index.css', 'vendor/katex.css']) {
      const first = read(file).match(/@import[^;]+;/)![0];
      expect(first, file).toMatch(/layers\.css/);
    }
  });

  it('puts every imported stylesheet in a declared layer', () => {
    const imports = [...read('index.css').matchAll(/@import '([^']+)'(?: layer\((\w+)\))?;/g)];
    const ours = imports.filter(([, path]) => path.startsWith('./') && path !== './layers.css');
    expect(ours.length).toBeGreaterThan(15);
    for (const [, path, layer] of ours) expect(layerList, path).toContain(layer);
  });

  it('keeps third-party styles in the vendor layer', () => {
    expect(read('index.css')).toMatch(/@waline\/client\/style' layer\(vendor\)/);
    expect(read('vendor/katex.css')).toMatch(/katex\.min\.css' layer\(vendor\)/);
  });
});
