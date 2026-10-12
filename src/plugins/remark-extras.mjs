import { visit } from 'unist-util-visit';

const ATTR_LINE = /^\{:\s*((?:\.[\w-]+\s*)+)\}$/;

const classesOf = (raw) =>
  raw
    .trim()
    .split(/\s+/)
    .map((c) => c.replace(/^\./, ''));

export default function remarkExtras() {
  return (tree) => {
    // Blockquote attributes. In CommonMark the attribute line is merged into the last paragraph (lazy continuation).
    visit(tree, 'blockquote', (node) => {
      const last = node.children.at(-1);
      if (last?.type !== 'paragraph') return;
      const tail = last.children.at(-1);
      if (tail?.type !== 'text') return;

      const lines = tail.value.split('\n');
      const m = lines.at(-1).trim().match(ATTR_LINE);
      if (!m) return;

      const classes = classesOf(m[1]);
      lines.pop();
      tail.value = lines.join('\n').replace(/\s+$/, '');
      while (
        last.children.at(-1)?.type === 'break' ||
        (last.children.at(-1)?.type === 'text' && !last.children.at(-1).value)
      ) {
        last.children.pop();
      }

      node.data = node.data ?? {};
      node.data.hProperties = { ...(node.data.hProperties ?? {}), className: classes };
    });

    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || index == null) return;
      parent.children[index] = {
        type: 'html',
        value: `<pre class="mermaid">${node.value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre>`,
      };
    });

    const isExternal = (url) =>
      /^https?:\/\//i.test(url) && !/^https?:\/\/(www\.)?zoooooone\.github\.io(\/|$)/i.test(url);
    visit(tree, 'link', (node) => {
      if (!isExternal(node.url)) return;
      node.data = node.data ?? {};
      node.data.hProperties = { ...(node.data.hProperties ?? {}), target: '_blank', rel: 'noopener noreferrer' };
    });
    visit(tree, 'html', (node) => {
      if (!node.value.includes('<a')) return;
      node.value = node.value.replace(/<a\b([^>]*)>/gi, (tag, attrs) => {
        const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
        if (!href || !isExternal(href) || /\btarget\s*=/.test(attrs)) return tag;
        return '<a' + attrs + ' target="_blank" rel="noopener noreferrer">';
      });
    });

    visit(tree, 'html', (node) => {
      if (!node.value.includes('<img')) return;
      node.value = node.value.replace(/<img\b(?![^>]*\bloading=)/g, '<img loading="lazy" decoding="async"');
    });
  };
}
