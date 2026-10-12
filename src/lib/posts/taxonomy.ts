import type { Post } from './types';

/** Matches jekyll-archives "pretty" mode so existing /categories/ and /tags/ URLs keep working. */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

export function groupBy(posts: Post[], key: 'categories' | 'tags') {
  const map = new Map<string, { name: string; slug: string; posts: Post[] }>();
  for (const post of posts) {
    for (const name of post.data[key]) {
      const slug = slugify(name);
      const entry = map.get(slug) ?? { name, slug, posts: [] };
      entry.posts.push(post);
      map.set(slug, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name));
}
