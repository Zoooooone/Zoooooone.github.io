import type { Item } from './commands';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function highlight(text: string, terms: string[]) {
  const frag = document.createDocumentFragment();
  if (!terms.length) {
    frag.append(text);
    return frag;
  }
  const re = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  text.split(re).forEach((part, i) => {
    if (i % 2 === 1) {
      const m = document.createElement('mark');
      m.textContent = part;
      frag.append(m);
    } else if (part) frag.append(part);
  });
  return frag;
}

export function renderItems(list: HTMLElement, items: Item[], active: number, terms: string[]) {
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
}
