import { describe, expect, it, vi } from 'vitest';
import { createCommands, docItem, G_ACTIONS, G_PAGES, matchCommands } from '@/scripts/shell/command-palette/commands';
import { latestDocs, searchDocs, snippetAt, termsOf, type Doc } from '@/scripts/shell/command-palette/search';

const doc = (over: Partial<Doc> = {}): Doc => ({
  id: 'a',
  no: 7,
  title: 'Untitled',
  cats: ['Study notes', 'Java'],
  tags: [],
  date: '2024-01-01',
  text: '',
  ...over,
});

describe('searchDocs', () => {
  it('requires every term to match somewhere', () => {
    const docs = [
      doc({ id: 'x', title: 'Java Map', text: 'hash table details' }),
      doc({ id: 'y', title: 'Java List' }),
    ];
    expect(searchDocs('java hash', docs).map((h) => h.doc.id)).toEqual(['x']);
    expect(searchDocs('java', docs)).toHaveLength(2);
    expect(searchDocs('python', docs)).toEqual([]);
  });

  it('ranks title matches above tags above categories above body, and ties by newest date', () => {
    const docs = [
      doc({ id: 'body', title: 'z', text: 'needle' }),
      doc({ id: 'cat', title: 'z', cats: ['needle'] }),
      doc({ id: 'tag', title: 'z', tags: ['needle'] }),
      doc({ id: 'title', title: 'needle post' }),
      doc({ id: 'title-old', title: 'needle post', date: '2020-01-01' }),
    ];
    expect(searchDocs('needle', docs).map((h) => h.doc.id)).toEqual(['title', 'title-old', 'tag', 'cat', 'body']);
  });

  it('is case-insensitive and reports where the body matched', () => {
    const [hit] = searchDocs('WALINE', [doc({ text: 'a note about Waline setup' })]);
    expect(hit.at).toBe('a note about '.length);
  });

  it('returns at most 30 results', () => {
    const docs = Array.from({ length: 50 }, (_, i) => doc({ id: String(i), title: 'match' }));
    expect(searchDocs('match', docs)).toHaveLength(30);
  });
});

describe('search helpers', () => {
  it('splits queries into lower-case terms', () => {
    expect(termsOf('  Java   Map ')).toEqual(['java', 'map']);
    expect(termsOf('')).toEqual([]);
  });

  it('cuts a snippet around the match and marks the cuts', () => {
    const text = 'x'.repeat(100) + 'NEEDLE' + 'y'.repeat(100);
    const snippet = snippetAt(text, 100)!;
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet).toContain('NEEDLE');
    expect(snippetAt('short', 0)).toBe('short…');
    expect(snippetAt('anything', -1)).toBeUndefined();
  });

  it('lists the newest documents first', () => {
    const docs = [doc({ id: 'old', date: '2020-01-01' }), doc({ id: 'new', date: '2025-01-01' })];
    expect(latestDocs(docs, 1).map((d) => d.id)).toEqual(['new']);
  });
});

describe('commands', () => {
  it('navigates through the router and clicks existing controls', () => {
    const go = vi.fn();
    const click = vi.fn();
    const commands = createCommands(go, click);
    commands.find((c) => c.meta === '/archives/')!.run();
    commands.find((c) => c.meta === 'THEME')!.run();
    expect(go).toHaveBeenCalledWith('/archives/');
    expect(click).toHaveBeenCalledWith('theme-toggle');
  });

  it('matches titles by every term and keeps actions in their own group', () => {
    const commands = createCommands(vi.fn(), vi.fn());
    const pages = matchCommands(commands, ['archives']);
    expect(pages.map((c) => c.group)).toEqual([G_PAGES]);
    const theme = matchCommands(commands, ['theme']);
    expect(theme.map((c) => c.group)).toEqual([G_ACTIONS]);
    expect(matchCommands(commands, ['nothing', 'matches'])).toEqual([]);
  });

  it('builds post entries with a zero-padded number and the last category', () => {
    const run = vi.fn();
    const item = docItem(doc({ no: 7, cats: ['Study notes', 'Java'] }), 'G', run, 'snippet');
    expect(item).toMatchObject({ kind: 'doc', key: 'NO.007', meta: 'Java', snippet: 'snippet', group: 'G' });
    item.run();
    expect(run).toHaveBeenCalled();
  });
});
