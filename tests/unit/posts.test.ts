import { describe, expect, it } from 'vitest';
import type { Post } from '@/lib/posts/types';
import { coverOf, kindOf } from '@/lib/posts/classify';
import { formatDate, pad3 } from '@/lib/posts/format';
import { monthlyActivity } from '@/lib/posts/stats';
import { groupBy, slugify } from '@/lib/posts/taxonomy';
import { excerptOf, plainText, readingMinutes } from '@/lib/posts/text';

function post(data: Record<string, unknown> = {}, body = ''): Post {
  return {
    id: 'x',
    body,
    data: { title: 't', date: new Date('2024-01-15T00:00:00Z'), categories: [], tags: [], ...data },
  } as unknown as Post;
}

describe('slugify (must keep the old Jekyll URLs working)', () => {
  it.each([
    ['Study notes', 'study-notes'],
    ['Daily life', 'daily-life'],
    ['C++ & Java', 'c-java'],
    ['  Leading and trailing  ', 'leading-and-trailing'],
    ['year-end summary', 'year-end-summary'],
    ['数据库', '数据库'],
    ['LeetCode 143', 'leetcode-143'],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('groupBy', () => {
  it('groups by slug, keeps the first spelling and sorts by size then name', () => {
    const posts = [
      post({ tags: ['Java', 'leetcode'] }),
      post({ tags: ['java', 'tutorial'] }),
      post({ tags: ['leetcode'] }),
      post({ tags: ['Alpha'] }),
    ];
    const groups = groupBy(posts, 'tags');
    expect(groups.map((g) => [g.slug, g.name, g.posts.length])).toEqual([
      ['java', 'Java', 2],
      ['leetcode', 'leetcode', 2],
      ['alpha', 'Alpha', 1],
      ['tutorial', 'tutorial', 1],
    ]);
  });
});

describe('classification', () => {
  it('derives the kind from the categories', () => {
    expect(kindOf(post({ categories: ['Travels', 'Japan'] }))).toBe('travel');
    expect(kindOf(post({ categories: ['Study notes', 'Java'] }))).toBe('tech');
    expect(kindOf(post({ categories: ['Daily life'] }))).toBe('life');
    expect(kindOf(post())).toBe('life');
  });

  it('reads the cover from both front matter shapes', () => {
    expect(coverOf(post({ image: '/a.jpg' }))).toBe('/a.jpg');
    expect(coverOf(post({ image: { path: '/b.jpg', alt: 'b' } }))).toBe('/b.jpg');
    expect(coverOf(post())).toBeUndefined();
  });
});

describe('text helpers', () => {
  it('strips markup, code, math and links from excerpts', () => {
    const body = [
      '## Title',
      '',
      'Some **bold** text with a [link](https://example.com) and `code`.',
      '',
      '```js',
      'const hidden = 1;',
      '```',
      '',
      '$$ x^2 $$',
      '',
      '![img](/a.png)',
      '> quoted',
    ].join('\n');
    expect(excerptOf(post({}, body), 200)).toBe('Title Some bold text with a link and code. quoted');
  });

  it('truncates with an ellipsis', () => {
    const out = excerptOf(post({}, 'a'.repeat(300)), 50);
    expect(out).toHaveLength(51);
    expect(out.endsWith('…')).toBe(true);
  });

  it('keeps code in the search text unless asked not to', () => {
    const body = 'before\n```js\nconst answer = 42;\n```\nafter';
    expect(plainText(post({}, body), true)).toContain('const answer = 42;');
    expect(plainText(post({}, body), false)).not.toContain('answer');
  });

  it('estimates reading time from CJK characters and Latin words', () => {
    expect(readingMinutes(post({}, ''))).toBe(1);
    expect(readingMinutes(post({}, '中'.repeat(800)))).toBe(2);
    expect(readingMinutes(post({}, Array(400).fill('word').join(' ')))).toBe(2);
  });
});

describe('formatting', () => {
  it('formats dates in the blog timezone (Asia/Tokyo)', () => {
    expect(formatDate(new Date('2023-12-31T16:00:00Z'))).toBe('2024-01-01');
    expect(formatDate(new Date('2023-12-31T14:59:00Z'))).toBe('2023-12-31');
  });

  it('pads archive numbers to three digits', () => {
    expect(pad3(7)).toBe('007');
    expect(pad3(46)).toBe('046');
    expect(pad3(1000)).toBe('1000');
  });
});

describe('monthlyActivity', () => {
  it('returns one cell per month, oldest first, and counts posts', () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5);
    const cells = monthlyActivity([post({ date: thisMonth }), post({ date: thisMonth })], 6);
    expect(cells).toHaveLength(6);
    expect(cells.at(-1)?.count).toBe(2);
    expect(cells.slice(0, -1).every((c) => c.count === 0)).toBe(true);
    expect(cells.map((c) => c.key)).toEqual([...cells.map((c) => c.key)].sort());
  });
});
