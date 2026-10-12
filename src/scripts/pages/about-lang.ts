import { onPage } from '@/scripts/core/lifecycle';

const KEY = 'aboutLang';

onPage(() => {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('.lang-tabs [data-lang]')];
  const panels = [...document.querySelectorAll<HTMLElement>('[data-panel]')];
  if (!tabs.length) return;

  const initial = (() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'zh' || saved === 'en') return saved;
    } catch {}
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  })();

  const apply = (lang: string, save = false) => {
    tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.lang === lang)));
    panels.forEach((p) => (p.hidden = p.dataset.panel !== lang));
    if (save) {
      try {
        localStorage.setItem(KEY, lang);
      } catch {}
    }
  };
  apply(initial);

  const offs = tabs.map((t) => {
    const fn = () => apply(t.dataset.lang!, true);
    t.addEventListener('click', fn);
    return () => t.removeEventListener('click', fn);
  });
  return () => offs.forEach((off) => off());
});
