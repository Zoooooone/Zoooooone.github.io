import { getCollection } from 'astro:content';
import type { Post } from './types';

const byDateAsc = (a: Post, b: Post) => a.data.date.valueOf() - b.data.date.valueOf();

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts');
  return posts.sort((a, b) => {
    if (a.data.pin !== b.data.pin) return a.data.pin ? -1 : 1;
    return b.data.date.valueOf() - a.data.date.valueOf();
  });
}

export async function getNumbering(): Promise<Map<string, number>> {
  const asc = [...(await getCollection('posts'))].sort(byDateAsc);
  return new Map(asc.map((p, i) => [p.id, i + 1]));
}

export async function getNeighbors(id: string): Promise<{ prev?: Post; next?: Post }> {
  const asc = [...(await getCollection('posts'))].sort(byDateAsc);
  const i = asc.findIndex((p) => p.id === id);
  return { prev: asc[i - 1], next: asc[i + 1] };
}
