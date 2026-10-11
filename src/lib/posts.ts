import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** 与 jekyll-archives 的 pretty 模式一致：小写，非字母数字换成连字符 */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts');
  return posts.sort((a, b) => {
    if (a.data.pin !== b.data.pin) return a.data.pin ? -1 : 1;
    return b.data.date.valueOf() - a.data.date.valueOf();
  });
}

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

export const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(d); // YYYY-MM-DD
