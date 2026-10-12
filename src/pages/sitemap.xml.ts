import type { APIContext } from 'astro';
import { getPosts, groupBy } from '@/lib/posts';

export async function GET(context: APIContext) {
  const origin = context.site!.origin;
  const posts = await getPosts();
  const newest = posts.reduce((a, b) => (a.data.date > b.data.date ? a : b)).data.date;

  const urls: { loc: string; lastmod?: Date }[] = [
    { loc: '/', lastmod: newest },
    { loc: '/categories/', lastmod: newest },
    { loc: '/tags/', lastmod: newest },
    { loc: '/archives/', lastmod: newest },
    { loc: '/about/' },
    ...posts.map((p) => ({ loc: `/posts/${p.id}/`, lastmod: p.data.date })),
    ...groupBy(posts, 'categories').map((g) => ({ loc: `/categories/${g.slug}/` })),
    ...groupBy(posts, 'tags').map((g) => ({ loc: `/tags/${g.slug}/` })),
  ];

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${origin}${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod.toISOString()}</lastmod>` : ''}\n  </url>`,
    )
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
