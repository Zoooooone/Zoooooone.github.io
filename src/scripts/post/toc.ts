import type { Cleanup } from '@/scripts/core/lifecycle';

export function runTocSpy(cleanups: Cleanup[]) {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc a[data-slug]')];
  if (!links.length) return;
  const map = new Map(links.map((a) => [a.dataset.slug!, a]));
  const heads = [...map.keys()].map((s) => document.getElementById(s)).filter(Boolean) as HTMLElement[];

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.remove('active'));
        map.get(e.target.id)?.classList.add('active');
      }
    },
    { rootMargin: '0px 0px -75% 0px' },
  );
  heads.forEach((h) => io.observe(h));
  cleanups.push(() => io.disconnect());
}

export function runTocFold(cleanups: Cleanup[]) {
  const toc = document.querySelector<HTMLElement>('.toc');
  const head = toc?.querySelector<HTMLElement>('b');
  if (!toc || !head) return;
  const mq = window.matchMedia('(max-width: 1100px)');

  const set = (open: boolean) => {
    toc.classList.toggle('open', open);
    head.setAttribute('aria-expanded', String(open));
  };
  const toggle = () => set(!toc.classList.contains('open'));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };
  const onLink = (e: Event) => {
    if ((e.target as Element).closest('a')) set(false);
  };

  const apply = () => {
    if (mq.matches) {
      head.setAttribute('role', 'button');
      head.tabIndex = 0;
      set(false);
    } else {
      head.removeAttribute('role');
      head.removeAttribute('tabindex');
      head.removeAttribute('aria-expanded');
      toc.classList.remove('open');
    }
  };

  head.addEventListener('click', toggle);
  head.addEventListener('keydown', onKey);
  toc.addEventListener('click', onLink);
  mq.addEventListener('change', apply);
  apply();
  cleanups.push(() => {
    head.removeEventListener('click', toggle);
    head.removeEventListener('keydown', onKey);
    toc.removeEventListener('click', onLink);
    mq.removeEventListener('change', apply);
  });
}
