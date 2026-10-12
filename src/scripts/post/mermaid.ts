import type { Cleanup } from '@/scripts/core/lifecycle';

type RGB = [number, number, number];

function siteColors() {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  document.body.append(probe);
  const read = (name: string): RGB => {
    probe.style.color = `var(${name})`;
    const m = getComputedStyle(probe).color.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/);
    return m ? [+m[1], +m[2], +m[3]] : [128, 128, 128];
  };
  const colors = { bg: read('--bg'), fg: read('--fg'), muted: read('--fg-muted'), accent: read('--accent') };
  probe.remove();
  return colors;
}

const mix = (c: RGB, d: RGB, t: number): RGB => [0, 1, 2].map((i) => c[i] * (1 - t) + d[i] * t) as RGB;
const hex = (c: RGB) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

export async function runMermaid(cleanups: Cleanup[], isStale: () => boolean) {
  const nodes = [...document.querySelectorAll<HTMLElement>('pre.mermaid')];
  if (!nodes.length) return;

  nodes.forEach((n) => {
    if (n.dataset.src === undefined) n.dataset.src = n.textContent ?? '';
  });
  const { default: mermaid } = await import('mermaid');
  if (isStale()) return;

  const render = async () => {
    const root = getComputedStyle(document.documentElement);
    const dark = document.documentElement.dataset.theme === 'dark';
    const fontFamily = root.getPropertyValue('--font-sans').trim();
    const mono = root.getPropertyValue('--font-mono').trim();
    const c = siteColors();
    const node = hex(mix(c.bg, c.accent, dark ? 0.16 : 0.1));
    const alt = hex(mix(c.bg, c.fg, dark ? 0.1 : 0.06));
    const edge = hex(mix(c.bg, c.fg, 0.3));
    const line = hex(mix(c.muted, c.accent, 0.35));
    const text = hex(c.fg);
    const accent = hex(c.accent);

    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      // Mermaid 12's default "neo" look adds drop shadows and larger padding.
      look: 'classic',
      fontFamily,
      // The default minNodeWidth (120px) inflates short labels such as "1" into huge circles.
      flowchart: { curve: 'linear', padding: 10, htmlLabels: true, minNodeWidth: 24 },
      themeVariables: {
        darkMode: dark,
        fontFamily,
        fontSize: '14px',
        background: 'transparent',
        primaryColor: node,
        primaryBorderColor: accent,
        primaryTextColor: text,
        secondaryColor: alt,
        secondaryBorderColor: hex(mix(c.bg, c.fg, 0.35)),
        secondaryTextColor: text,
        tertiaryColor: alt,
        tertiaryBorderColor: edge,
        tertiaryTextColor: text,
        lineColor: line,
        textColor: text,
        mainBkg: node,
        nodeBorder: accent,
        nodeTextColor: text,
        clusterBkg: alt,
        clusterBorder: edge,
        titleColor: text,
        edgeLabelBackground: hex(c.bg),
        arrowheadColor: line,
      },
      themeCSS: `
        .node rect, .node polygon, .node path, .node circle, .node ellipse { stroke-width: 1.25px; }
        .node rect, .cluster rect, .label-container { rx: 0; ry: 0; }
        .cluster rect { stroke-dasharray: 4 3; stroke-width: 1px; }
        .edgePath .path, .flowchart-link { stroke-width: 1.4px; }
        .edgeLabel, .edgeLabel p, .edgeLabel span { font-family: ${mono}; font-size: 12px; }
        .edgeLabel rect { opacity: 0.9; }
        .marker { fill: ${line}; stroke: ${line}; }
      `,
    });
    nodes.forEach((n) => {
      n.removeAttribute('data-processed');
      n.textContent = n.dataset.src ?? '';
    });
    await mermaid.run({ nodes });
  };

  await render();

  let timer = 0;
  const mo = new MutationObserver(() => {
    if (isStale()) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void render(), 1000);
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
  cleanups.push(() => {
    window.clearTimeout(timer);
    mo.disconnect();
  });
}
