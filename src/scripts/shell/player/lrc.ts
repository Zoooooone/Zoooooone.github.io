export type Lyric = { t: number; text: string };

export function parseLrc(text: string): Lyric[] {
  const out: Lyric[] = [];
  for (const line of text.split(/\r?\n/)) {
    const stamps = [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    const content = line.replace(/\[[^\]]*\]/g, '').trim();
    if (!stamps.length || !content) continue;
    for (const s of stamps) out.push({ t: Number(s[1]) * 60 + Number(s[2]), text: content });
  }
  return out.sort((a, b) => a.t - b.t);
}

export function lyricIndexAt(lyrics: Lyric[], time: number, hint: number): number {
  if (hint >= 0 && lyrics[hint].t <= time && !(lyrics[hint + 1] && lyrics[hint + 1].t <= time)) return hint;
  return lyrics.findLastIndex((l) => l.t <= time);
}
