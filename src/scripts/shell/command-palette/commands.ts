import { pad3 } from '@/lib/posts/format';
import type { Doc } from './search';

export type Item = {
  kind: 'cmd' | 'doc';
  key: string;
  title: string;
  meta?: string;
  snippet?: string;
  group?: string;
  run: () => void;
};

export const G_LATEST = '最新文章 · LATEST';
export const G_PAGES = '页面跳转 · GO TO';
export const G_ACTIONS = '操作 · ACTIONS';
export const G_POSTS = '文章 · POSTS';

export function createCommands(go: (href: string) => void, click: (id: string) => void): Item[] {
  const page = (title: string, href: string): Item => ({
    kind: 'cmd',
    key: 'GO',
    title,
    meta: href,
    group: G_PAGES,
    run: () => go(href),
  });
  const action = (title: string, meta: string, id: string): Item => ({
    kind: 'cmd',
    key: 'SYS',
    title,
    meta,
    group: G_ACTIONS,
    run: () => click(id),
  });

  return [
    page('文章 · Posts', '/'),
    page('分类 · Categories', '/categories/'),
    page('标签 · Tags', '/tags/'),
    page('归档 · Archives', '/archives/'),
    page('关于 · About', '/about/'),
    page('更新日志 · Changelog', '/changelog/'),
    page('访问统计 · Stats', '/stats/'),
    page('模型观察 · Model Watch', '/model-watch/'),
    action('切换主题（深浅色）· Theme', 'THEME', 'theme-toggle'),
    action('切换背景壁纸 · Wallpaper', 'WALLPAPER', 'bg-toggle'),
  ];
}

export function matchCommands(commands: Item[], terms: string[]): Item[] {
  return commands
    .filter((c) => terms.every((t) => c.title.toLowerCase().includes(t)))
    .map((c) => ({ ...c, group: c.group === G_ACTIONS ? G_ACTIONS : G_PAGES }));
}

export const docItem = (d: Doc, group: string, run: () => void, snippet?: string): Item => ({
  kind: 'doc',
  key: `NO.${pad3(d.no)}`,
  title: d.title,
  meta: d.cats.at(-1),
  snippet,
  group,
  run,
});
