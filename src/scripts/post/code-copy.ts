import { onPage } from '@/scripts/core/lifecycle';

const COPY_LABEL = 'COPY';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(ta);
    ta.select();
    let ok: boolean;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

onPage(() => {
  const timers: number[] = [];

  document.querySelectorAll<HTMLPreElement>('.prose pre.astro-code').forEach((pre) => {
    if (pre.parentElement?.classList.contains('code-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'code-wrap';
    pre.replaceWith(wrap);
    wrap.append(pre);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.textContent = COPY_LABEL;
    btn.setAttribute('aria-label', '复制代码');
    btn.addEventListener('click', async () => {
      const ok = await copyText(pre.innerText.replace(/\n$/, ''));
      btn.textContent = ok ? 'COPIED' : 'FAILED';
      btn.dataset.state = ok ? 'ok' : 'err';
      timers.push(
        window.setTimeout(() => {
          btn.textContent = COPY_LABEL;
          delete btn.dataset.state;
        }, 1400),
      );
    });
    wrap.append(btn);
  });

  document.querySelectorAll<HTMLImageElement>('.prose img.custom-img').forEach((img) => {
    if (img.closest('figure.reg')) return;
    const fig = document.createElement('figure');
    fig.className = 'reg';
    img.replaceWith(fig);
    fig.append(img);
  });

  return () => timers.forEach((t) => clearTimeout(t));
});
