import { navigate } from 'astro:transitions/client';
import { setScrollLock } from '@/scripts/core/scroll-lock';
import { createCommands, docItem, G_LATEST, G_POSTS, matchCommands, type Item } from './commands';
import { renderItems } from './render';
import { latestDocs, searchDocs, snippetAt, termsOf, type Doc } from './search';

const root = document.getElementById('cmdk');
const input = root?.querySelector<HTMLInputElement>('input');
const list = root?.querySelector<HTMLUListElement>('.cmdk-list');
const status = root?.querySelector<HTMLElement>('.cmdk-status');

if (root && input && list) {
  let docs: Doc[] | null = null;
  let loading: Promise<Doc[]> | null = null;
  let items: Item[] = [];
  let active = 0;

  const go = (href: string) => void navigate(href);
  const click = (id: string) => document.getElementById(id)?.click();
  const commands = createCommands(go, click);

  const loadIndex = () => {
    loading ??= fetch('/search.json')
      .then((r) => {
        if (!r.ok) throw new Error(`search index: ${r.status}`);
        return r.json() as Promise<Doc[]>;
      })
      .then((d) => (docs = d))
      .catch((e) => {
        loading = null;
        throw e;
      });
    return loading;
  };

  const render = (terms: string[]) => renderItems(list, items, active, terms);
  const openPost = (d: Doc) => () => go(`/posts/${d.id}/`);

  const update = async () => {
    const q = input.value.trim();
    active = 0;

    const all = docs ?? (await loadIndex().catch(() => null));

    if (!q) {
      // Nothing is preselected, so Enter or a stray click never fires an action; an item must be chosen explicitly.
      active = -1;
      items = all ? latestDocs(all).map((d) => docItem(d, G_LATEST, openPost(d))) : [];
      if (status) status.textContent = 'LATEST';
      render([]);
      return;
    }

    if (!all) {
      items = [];
      if (status) status.textContent = '索引加载失败';
      render([]);
      return;
    }

    const terms = termsOf(q);
    const hits = searchDocs(q, all);
    items = [
      ...matchCommands(commands, terms),
      ...hits.map(({ doc, at }) => docItem(doc, G_POSTS, openPost(doc), snippetAt(doc.text, at))),
    ];
    if (status) status.textContent = `${hits.length} RESULTS`;
    render(terms);
  };

  const open = () => {
    root.hidden = false;
    setScrollLock('cmdk-open', true);
    input.value = '';
    void update();
    requestAnimationFrame(() => input.focus());
  };
  const close = () => {
    root.hidden = true;
    setScrollLock('cmdk-open', false);
  };

  const choose = (i: number) => {
    const it = items[i];
    if (!it) return;
    close();
    it.run();
  };

  input.addEventListener('input', () => void update());

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
      e.preventDefault();
      active = Math.min(items.length - 1, active + 1);
      render(termsOf(input.value.trim()));
    } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
      e.preventDefault();
      active = Math.max(0, active - 1);
      render(termsOf(input.value.trim()));
    } else if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      choose(active);
    }
  });

  list.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('.cmdk-item');
    if (li) choose(Number(li.dataset.i));
  });
  list.addEventListener('mousemove', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('.cmdk-item');
    if (!li) return;
    const i = Number(li.dataset.i);
    if (i === active) return;
    list.querySelector('.on')?.classList.remove('on');
    li.classList.add('on');
    active = i;
  });

  root.querySelector('.cmdk-backdrop')?.addEventListener('click', close);
  root.querySelector('.cmdk-input kbd')?.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    const typing =
      /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName) ||
      (e.target as HTMLElement).isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (root.hidden) open();
      else close();
    } else if (e.key === '/' && !typing && root.hidden) {
      e.preventDefault();
      open();
    } else if (e.key === 'Escape' && !root.hidden) {
      close();
    }
  });

  document.getElementById('open-search')?.addEventListener('click', open);

  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  (idle ?? ((cb: () => void) => setTimeout(cb, 2500)))(() => void loadIndex().catch(() => {}));
}
