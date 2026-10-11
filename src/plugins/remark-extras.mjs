// 兼容旧文章里的两种 kramdown / Chirpy 写法：
//   1. 引用块后面跟的 `{: .prompt-tip}`、`{: .poem .poem-font}` 属性行
//   2. ```mermaid 代码块（交给前端渲染，而不是代码高亮）
import { visit } from 'unist-util-visit';

const ATTR_LINE = /^\{:\s*((?:\.[\w-]+\s*)+)\}$/;

const classesOf = (raw) =>
  raw
    .trim()
    .split(/\s+/)
    .map((c) => c.replace(/^\./, ''));

export default function remarkExtras() {
  return (tree) => {
    // 1. 引用块属性。CommonMark 里属性行会被并入引用块最后一个段落（lazy continuation）。
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
      // 去掉可能残留的硬换行节点
      while (last.children.at(-1)?.type === 'break' || (last.children.at(-1)?.type === 'text' && !last.children.at(-1).value)) {
        last.children.pop();
      }

      node.data = node.data ?? {};
      node.data.hProperties = { ...(node.data.hProperties ?? {}), className: classes };
    });

    // 2. mermaid
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
  };
}
