type Attrs = Record<string, string | number | boolean | undefined>;
type Child = Node | string | null | undefined | false;

const SVG_NS = 'http://www.w3.org/2000/svg';

function apply(el: Element, attrs: Attrs, children: Child[]) {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    el.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child) el.append(child);
  }
  return el;
}

// Everything shown comes from a server (page paths, referrers, model names), so it only ever goes in as text.
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  return apply(document.createElement(tag), attrs, children) as HTMLElementTagNameMap[K];
}

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): SVGElementTagNameMap[K] {
  return apply(document.createElementNS(SVG_NS, tag), attrs, children) as SVGElementTagNameMap[K];
}
