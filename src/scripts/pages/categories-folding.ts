import { onPage, type Cleanup } from '@/scripts/core/lifecycle';

onPage(() => {
  const groups = [...document.querySelectorAll<HTMLElement>('.dir-group')];
  const all = document.getElementById('dir-toggle-all');
  if (!groups.length) return;

  const set = (g: HTMLElement, open: boolean) => {
    g.dataset.open = String(open);
    g.querySelector('.dir-toggle')?.setAttribute('aria-expanded', String(open));
  };

  const syncAll = () => {
    if (!all) return;
    const anyOpen = groups.some((g) => g.querySelector('.dir-toggle') && g.dataset.open === 'true');
    all.dataset.state = anyOpen ? 'open' : 'closed';
    all.textContent = anyOpen ? '全部收起' : '全部展开';
  };

  const offs: Cleanup[] = [];
  groups.forEach((g) => {
    const btn = g.querySelector<HTMLButtonElement>('.dir-toggle');
    if (!btn) return;
    const fn = () => {
      set(g, g.dataset.open !== 'true');
      syncAll();
    };
    btn.addEventListener('click', fn);
    offs.push(() => btn.removeEventListener('click', fn));
  });

  if (all) {
    const fn = () => {
      const open = all.dataset.state === 'closed';
      groups.forEach((g) => g.querySelector('.dir-toggle') && set(g, open));
      syncAll();
    };
    all.addEventListener('click', fn);
    offs.push(() => all.removeEventListener('click', fn));
  }

  syncAll();
  return () => offs.forEach((off) => off());
});
