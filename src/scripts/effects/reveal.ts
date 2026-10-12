import { onPage } from '@/scripts/core/lifecycle';

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

onPage(() => {
  const targets = [...document.querySelectorAll<HTMLElement>('[data-reveal], [data-count]')];
  if (!targets.length) return;

  const timers: number[] = [];
  const vh = window.innerHeight;

  const done = (el: HTMLElement) => el.dataset.revealed === '1';

  const showNow = (el: HTMLElement) => {
    if (done(el)) return;
    el.dataset.revealed = '1';
    el.classList.add('shown');
    if (el.dataset.count !== undefined) {
      el.textContent = el.dataset.count;
      el.classList.add('counted');
    }
  };

  const count = (el: HTMLElement) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) {
      el.classList.add('counted');
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = String(target);
      el.classList.add('counted');
      return;
    }
    const steps = Math.min(20, Math.max(6, Math.round(target)));
    let i = 0;
    el.textContent = '0';
    el.classList.add('counted');
    const tick = () => {
      i++;
      el.textContent = String(Math.round(target * easeOut(i / steps)));
      if (i < steps) timers.push(window.setTimeout(tick, 34));
    };
    timers.push(window.setTimeout(tick, 120));
  };

  const play = (el: HTMLElement, order: number) => {
    if (done(el)) return;
    el.dataset.revealed = '1';
    if (el.dataset.reveal !== undefined) {
      el.style.setProperty('--base', '0s');
      el.style.setProperty('--i', String(Math.min(order, 12)));
      el.classList.add(el.dataset.reveal === 'wipe' ? 'wipe' : 'step-in');
    }
    if (el.dataset.count !== undefined) count(el);
  };

  const pending = () => targets.filter((el) => !done(el));

  const flushAbove = () => {
    pending().forEach((el) => {
      if (el.getBoundingClientRect().bottom < 0) showNow(el);
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      visible.forEach((e, i) => {
        play(e.target as HTMLElement, i);
        io.unobserve(e.target);
      });
      flushAbove();
    },
    { rootMargin: '0px 0px -6% 0px' },
  );

  let order = 0;
  targets.forEach((el) => {
    if (done(el)) return;
    const rect = el.getBoundingClientRect();
    if (rect.bottom < 0) showNow(el);
    else if (rect.top < vh * 0.96) play(el, order++);
    else io.observe(el);
  });

  timers.push(window.setTimeout(() => pending().forEach(showNow), 6000));

  return () => {
    io.disconnect();
    timers.forEach((t) => clearTimeout(t));
  };
});
