import type { APIContext } from 'astro';

export function GET(context: APIContext) {
  const body = `User-agent: *\nAllow: /\n\nDisallow: /verification/\n\nSitemap: ${new URL('/sitemap.xml', context.site).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
