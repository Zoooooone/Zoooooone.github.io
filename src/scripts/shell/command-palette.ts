import { navigate } from 'astro:transitions/client';
type Doc = { id: string; no: number; title: string; cats: string[]; tags: string[]; date: string; text: string };

type Item = {
  kind: 'cmd' | 'doc';
  key: string;
  title: string;
  meta?: string;
  snippet?: string;
  group?: string;
  run: () => void;
};

const G_LATEST = '最新文章 · LATEST';
const G_PAGES = '页面跳转 · GO TO';
const G_ACTIONS = '操作 · ACTIONS';
const G_POSTS = '文章 · POSTS';

const root = document.getElementById('cmdk');
const input = root?.querySelector<HTMLInputElement>('input');
const list = root?.querySelector<HTMLUListElement>('.cmdk-list');
const status = root?.querySelector<HTMLElement>('.cmdk-status');

if (root && input && list) {
  let docs: Doc[] | null = null;
  let loading: Promise<Doc[]> | null = null;
  let items: Item[] = [];
  let active = 0;

  const go = (href: string) => () => {
    void navigate(href);
  };
  const click = (id: string) => () => document.getElementById(id)?.click();

  const pages: Item[] = [
    { kind: 'cmd', key: 'GO', title: '文章 · Posts', meta: '/', group: G_PAGES, run: go('/') },
    {
      kind: 'cmd',
      key: 'GO',
      title: '分类 · Categories',
      meta: '/categories/',
      group: G_PAGES,
      run: go('/categories/'),
    },
    { kind: 'cmd', key: 'GO', title: '标签 · Tags', meta: '/tags/', group: G_PAGES, run: go('/tags/') },
    { kind: 'cmd', key: 'GO', title: '归档 · Archives', meta: '/archives/', group: G_PAGES, run: go('/archives/') },
    { kind: 'cmd', key: 'GO', title: '关于 · About', meta: '/about/', group: G_PAGES, run: go('/about/') },
    {
      kind: 'cmd',
      key: 'GO',
      title: '更新日志 · Changelog',
      meta: '/changelog/',
      group: G_PAGES,
      run: go('/changelog/'),
    },
  ];
  const actions: Item[] = [
    {
      kind: 'cmd',
      key: 'SYS',
      title: '切换主题（深浅色）· Theme',
      meta: 'THEME',
      group: G_ACTIONS,
      run: click('theme-toggle'),
    },
    {
      kind: 'cmd',
      key: 'SYS',
      title: '切换背景壁纸 · Wallpaper',
      meta: 'WALLPAPER',
      group: G_ACTIONS,
      run: click('bg-toggle'),
    },
  ];
  const commands: Item[] = [...pages, ...actions];

  const load = () => {
    loading ??= fetch('/search.json')
      .then((r) => r.json() as Promise<Doc[]>)
      .then((d) => (docs = d));
    return loading;
  };

  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const highlight = (text: string, terms: string[]) => {
    const frag = document.createDocumentFragment();
    if (!terms.length) {
      frag.append(text);
      return frag;
    }
    const re = new RegExp(`(${terms.map(esc).join('|')})`, 'gi');
    text.split(re).forEach((part, i) => {
      if (i % 2 === 1) {
        const m = document.createElement('mark');
        m.textContent = part;
        frag.append(m);
      } else if (part) frag.append(part);
    });
    return frag;
  };

  const pad = (n: number) => String(n).padStart(3, '0');

  const searchDocs = (q: string, all: Doc[]): { doc: Doc; score: number; at: number }[] => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out: { doc: Doc; score: number; at: number }[] = [];
    for (const d of all) {
      const t = d.title.toLowerCase();
      const tags = d.tags.join(' ').toLowerCase();
      const cats = d.cats.join(' ').toLowerCase();
      const body = d.text.toLowerCase();
      let score = 0;
      let at = -1;
      let ok = true;
      for (const term of terms) {
        let s = 0;
        if (t.includes(term)) s += t.startsWith(term) ? 14 : 10;
        if (tags.includes(term)) s += 6;
        if (cats.includes(term)) s += 4;
        const bi = body.indexOf(term);
        if (bi >= 0) {
          let n = 0;
          for (let p = bi; p >= 0 && n < 5; p = body.indexOf(term, p + term.length)) n++;
          s += 2 + n;
          if (at < 0) at = bi;
        }
        if (!s) {
          ok = false;
          break;
        }
        score += s;
      }
      if (ok) out.push({ doc: d, score, at });
    }
    return out.sort((a, b) => b.score - a.score || b.doc.date.localeCompare(a.doc.date)).slice(0, 30);
  };

  const render = (terms: string[]) => {
    list.innerHTML = '';
    let lastGroup: string | undefined;
    items.forEach((it, i) => {
      if (it.group && it.group !== lastGroup) {
        const g = document.createElement('li');
        g.className = 'cmdk-group';
        g.setAttribute('role', 'presentation');
        g.textContent = it.group;
        list.append(g);
      }
      lastGroup = it.group;
      const li = document.createElement('li');
      li.className = `cmdk-item${i === active ? ' on' : ''}`;
      li.setAttribute('role', 'option');
      li.dataset.i = String(i);

      const k = document.createElement('span');
      k.className = 'k';
      k.textContent = it.key;

      const body = document.createElement('span');
      body.className = 'b';
      const title = document.createElement('span');
      title.className = 't';
      title.append(highlight(it.title, terms));
      body.append(title);
      if (it.snippet) {
        const s = document.createElement('span');
        s.className = 's';
        s.append(highlight(it.snippet, terms));
        body.append(s);
      }

      const m = document.createElement('span');
      m.className = 'm';
      m.textContent = it.meta ?? '';

      li.append(k, body, m);
      list.append(li);
    });
    if (active >= 0) list.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  };

  const docItem = (d: Doc, group: string, snippet?: string): Item => ({
    kind: 'doc',
    key: `NO.${pad(d.no)}`,
    title: d.title,
    meta: d.cats.at(-1),
    snippet,
    group,
    run: go(`/posts/${d.id}/`),
  });

  const update = async () => {
    const q = input.value.trim();
    active = 0;

    if (!q) {
      active = -1;
      items = [];
      const all = docs ?? (await load().catch(() => null));
      if (all) {
        const latest = [...all].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
        items.push(...latest.map((d) => docItem(d, G_LATEST)));
      }
      if (status) status.textContent = 'LATEST';
      render([]);
      return;
    }

    const all = docs ?? (await load().catch(() => null));
    if (!all) {
      items = [];
      if (status) status.textContent = '索引加载失败';
      render([]);
      return;
    }

    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = searchDocs(q, all);
    const matchedCmds = commands
      .filter((c) => terms.every((t) => c.title.toLowerCase().includes(t)))
      .map((c) => ({ ...c, group: c.group === G_ACTIONS ? G_ACTIONS : G_PAGES }));

    items = [
      ...matchedCmds,
      ...hits.map(({ doc, at }) => {
        let snippet: string | undefined;
        if (at >= 0) {
          const from = Math.max(0, at - 24);
          snippet = `${from > 0 ? '…' : ''}${doc.text.slice(from, at + 80)}…`;
        }
        return docItem(doc, G_POSTS, snippet);
      }),
    ];
    if (status) status.textContent = `${hits.length} RESULTS`;
    render(terms);
  };

  const open = () => {
    root.hidden = false;
    document.documentElement.classList.add('cmdk-open');
    input.value = '';
    void update();
    requestAnimationFrame(() => input.focus());
  };
  const close = () => {
    root.hidden = true;
    document.documentElement.classList.remove('cmdk-open');
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
      render(input.value.trim().toLowerCase().split(/\s+/).filter(Boolean));
    } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
      e.preventDefault();
      active = Math.max(0, active - 1);
      render(input.value.trim().toLowerCase().split(/\s+/).filter(Boolean));
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
  (idle ?? ((cb: () => void) => setTimeout(cb, 2500)))(() => void load().catch(() => {}));
}
