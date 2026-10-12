import { getNumbering, getPosts, plainText } from '@/lib/posts';

export async function GET() {
  const posts = await getPosts();
  const numbering = await getNumbering();

  const index = posts.map((p) => ({
    id: p.id,
    no: numbering.get(p.id) ?? 0,
    title: p.data.title,
    cats: p.data.categories,
    tags: p.data.tags,
    date: p.data.date.toISOString().slice(0, 10),
    text: plainText(p),
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
