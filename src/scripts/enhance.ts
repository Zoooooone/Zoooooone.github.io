// 文章/页面的客户端增强：mermaid 图表、图库（info.json + 灯箱）。
// 页面里没有对应元素时什么都不做，也不会加载 mermaid。

async function runMermaid() {
  const nodes = document.querySelectorAll<HTMLElement>('pre.mermaid');
  if (!nodes.length) return;
  const { default: mermaid } = await import('mermaid');
  const dark = document.documentElement.dataset.theme === 'dark';
  mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default' });
  await mermaid.run({ nodes: [...nodes] });
}

type Item = { src: string; title?: string; description?: string };

async function runGalleries() {
  const galleries = document.querySelectorAll<HTMLElement>('.gallery[data-src]');
  if (!galleries.length) return;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = '<img alt="" /><div></div>';
  document.body.append(box);
  const boxImg = box.querySelector('img')!;
  const boxCap = box.querySelector('div')!;
  box.addEventListener('click', () => box.classList.remove('open'));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && box.classList.remove('open'));

  for (const el of galleries) {
    try {
      const items: Item[] = await (await fetch(el.dataset.src!)).json();
      for (const it of items) {
        const fig = document.createElement('figure');
        const img = document.createElement('img');
        img.src = it.src;
        img.loading = 'lazy';
        img.alt = it.description ?? it.title ?? '';
        img.addEventListener('click', () => {
          boxImg.src = it.src;
          boxCap.textContent = [it.title, it.description].filter(Boolean).join(' · ');
          box.classList.add('open');
        });
        fig.append(img);
        el.append(fig);
      }
    } catch {
      el.remove();
    }
  }
}

void runMermaid();
void runGalleries();
