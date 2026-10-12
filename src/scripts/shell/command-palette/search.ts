export type Doc = { id: string; no: number; title: string; cats: string[]; tags: string[]; date: string; text: string };
export type Hit = { doc: Doc; score: number; at: number };

const MAX_RESULTS = 30;
const SNIPPET_BEFORE = 24;
const SNIPPET_AFTER = 80;

export const termsOf = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean);

export function searchDocs(query: string, docs: Doc[]): Hit[] {
  const terms = termsOf(query);
  const out: Hit[] = [];
  for (const doc of docs) {
    const title = doc.title.toLowerCase();
    const tags = doc.tags.join(' ').toLowerCase();
    const cats = doc.cats.join(' ').toLowerCase();
    const body = doc.text.toLowerCase();
    let score = 0;
    let at = -1;
    let ok = true;
    for (const term of terms) {
      let s = 0;
      if (title.includes(term)) s += title.startsWith(term) ? 14 : 10;
      if (tags.includes(term)) s += 6;
      if (cats.includes(term)) s += 4;
      const bodyAt = body.indexOf(term);
      if (bodyAt >= 0) {
        let repeats = 0;
        for (let p = bodyAt; p >= 0 && repeats < 5; p = body.indexOf(term, p + term.length)) repeats++;
        s += 2 + repeats;
        if (at < 0) at = bodyAt;
      }
      if (!s) {
        ok = false;
        break;
      }
      score += s;
    }
    if (ok) out.push({ doc, score, at });
  }
  return out.sort((a, b) => b.score - a.score || b.doc.date.localeCompare(a.doc.date)).slice(0, MAX_RESULTS);
}

export function snippetAt(text: string, at: number): string | undefined {
  if (at < 0) return undefined;
  const from = Math.max(0, at - SNIPPET_BEFORE);
  return `${from > 0 ? '…' : ''}${text.slice(from, at + SNIPPET_AFTER)}…`;
}

export const latestDocs = (docs: Doc[], count = 6) =>
  [...docs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, count);
