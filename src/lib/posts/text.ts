import type { Post } from './types';

const stripMarkup = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{%[\s\S]*?%\}|\{:[^}]*\}/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function excerptOf(post: Post, max = 96): string {
  const text = stripMarkup((post.body ?? '').replace(/```[\s\S]*?```/g, ' ').replace(/\$\$[\s\S]*?\$\$/g, ' '));
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export function plainText(post: Post, keepCode = true): string {
  let s = post.body ?? '';
  s = keepCode ? s.replace(/^```.*$/gm, ' ') : s.replace(/```[\s\S]*?```/g, ' ');
  return stripMarkup(s.replace(/\$\$([\s\S]*?)\$\$/g, ' $1 '));
}

/** About 400 CJK characters or 200 Latin words per minute. */
export function readingMinutes(post: Post): number {
  const body = post.body ?? '';
  const cjk = (body.match(/[一-鿿]/g) ?? []).length;
  const words = body
    .replace(/[一-鿿]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
  return Math.max(1, Math.ceil(cjk / 400 + words / 200));
}
