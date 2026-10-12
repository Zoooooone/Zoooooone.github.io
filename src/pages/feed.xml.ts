import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { site } from '@/config';
import { excerptOf, getPosts } from '@/lib/posts';

export async function GET(context: APIContext) {
  const posts = (await getPosts()).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: site.title,
    description: site.tagline,
    site: context.site!,
    trailingSlash: true,
    items: posts.slice(0, 30).map((p) => ({
      title: p.data.title,
      link: `/posts/${p.id}/`,
      pubDate: p.data.date,
      description: excerptOf(p, 160),
      categories: [...p.data.categories, ...p.data.tags],
      author: site.author,
    })),
    customData: '<language>zh-CN</language>',
  });
}
