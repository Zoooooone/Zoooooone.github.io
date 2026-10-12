import { onPage } from '@/scripts/core/lifecycle';

onPage(() => {
  const clocks = [...document.querySelectorAll<HTMLElement>('[data-clock]')];
  if (!clocks.length) return;

  const tick = () => {
    const now = new Date();
    clocks.forEach((el) => {
      const out = el.querySelector('b');
      if (!out) return;
      try {
        out.textContent = new Intl.DateTimeFormat('en-GB', {
          timeZone: el.dataset.clock,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(now);
      } catch {}
    });
  };

  tick();
  const id = window.setInterval(tick, 1000);
  return () => window.clearInterval(id);
});
