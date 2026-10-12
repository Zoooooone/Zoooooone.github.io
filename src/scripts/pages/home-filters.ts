import { onPage } from '@/scripts/core/lifecycle';

onPage(() => {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.filter');
  const rows = document.querySelectorAll<HTMLElement>('.rows .row');
  if (!buttons.length) return;

  const apply = (key: string) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === key)));
    let shown = 0;
    rows.forEach((row) => {
      const match = key === 'all' || (row.dataset.cats ?? '').split(' ').includes(key);
      row.classList.toggle('is-hidden', !match);
      if (match) {
        row.classList.remove('step-in', 'pre');
        row.style.setProperty('--i', String(Math.min(shown++, 14)));
        void row.offsetWidth;
        row.classList.add('step-in');
      }
    });
    history.replaceState(history.state, '', key === 'all' ? location.pathname : `#${key}`);
  };

  const handlers = [...buttons].map((b) => {
    const fn = () => apply(b.dataset.filter!);
    b.addEventListener('click', fn);
    return () => b.removeEventListener('click', fn);
  });

  const initial = location.hash.slice(1);
  if (initial && [...buttons].some((b) => b.dataset.filter === initial)) apply(initial);

  return () => handlers.forEach((off) => off());
});
