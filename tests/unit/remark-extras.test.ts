import { describe, expect, it } from 'vitest';
import remarkExtras from '../../src/plugins/remark-extras.mjs';

type Node = { type: string; [key: string]: unknown };

const run = (tree: Node) => {
  (remarkExtras() as (t: Node) => void)(tree);
  return tree;
};

describe('remark-extras', () => {
  it('turns a trailing kramdown attribute line in a blockquote into classes', () => {
    const quote: Node = {
      type: 'blockquote',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Heads up\n{: .prompt-tip}' }] }],
    };
    run({ type: 'root', children: [quote] });
    expect(quote.data).toEqual({ hProperties: { className: ['prompt-tip'] } });
    const text = ((quote.children as Node[])[0].children as Node[])[0];
    expect(text.value).toBe('Heads up');
  });

  it('supports several classes', () => {
    const quote: Node = {
      type: 'blockquote',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'poem\n{: .poem .poem-font}' }] }],
    };
    run({ type: 'root', children: [quote] });
    expect(quote.data).toEqual({ hProperties: { className: ['poem', 'poem-font'] } });
  });

  it('leaves ordinary blockquotes alone', () => {
    const quote: Node = {
      type: 'blockquote',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'just a quote' }] }],
    };
    run({ type: 'root', children: [quote] });
    expect(quote.data).toBeUndefined();
  });

  it('hands mermaid fences to the client renderer with escaped source', () => {
    const tree: Node = {
      type: 'root',
      children: [{ type: 'code', lang: 'mermaid', value: 'graph LR\nA-->B & C' }],
    };
    run(tree);
    expect((tree.children as Node[])[0]).toEqual({
      type: 'html',
      value: '<pre class="mermaid">graph LR\nA--&gt;B &amp; C</pre>',
    });
  });

  it('opens external links in a new tab but keeps site links in the router', () => {
    const external: Node = { type: 'link', url: 'https://example.com/a' };
    const own: Node = { type: 'link', url: 'https://zoooooone.github.io/posts/x/' };
    const relative: Node = { type: 'link', url: '/posts/x/' };
    run({ type: 'root', children: [external, own, relative] });
    expect(external.data).toEqual({ hProperties: { target: '_blank', rel: 'noopener noreferrer' } });
    expect(own.data).toBeUndefined();
    expect(relative.data).toBeUndefined();
  });

  it('adds the same attributes to raw html anchors, unless a target is already there', () => {
    const plain: Node = { type: 'html', value: '<a href="https://example.com">x</a>' };
    const targeted: Node = { type: 'html', value: '<a href="https://example.com" target="_self">x</a>' };
    run({ type: 'root', children: [plain, targeted] });
    expect(plain.value).toContain('target="_blank" rel="noopener noreferrer"');
    expect(targeted.value).toBe('<a href="https://example.com" target="_self">x</a>');
  });

  it('lazy-loads raw html images once', () => {
    const img: Node = { type: 'html', value: '<img src="/a.png"><img src="/b.png" loading="eager">' };
    run({ type: 'root', children: [img] });
    expect(img.value).toBe('<img loading="lazy" decoding="async" src="/a.png"><img src="/b.png" loading="eager">');
  });
});
