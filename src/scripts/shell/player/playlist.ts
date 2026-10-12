export type Track = { name: string; artist: string; url: string; cover?: string; lrc?: string };
export type Mode = 'list' | 'shuffle' | 'single';

export const isMode = (value: unknown): value is Mode => value === 'list' || value === 'shuffle' || value === 'single';

export const nextMode = (mode: Mode): Mode => (mode === 'list' ? 'shuffle' : mode === 'shuffle' ? 'single' : 'list');

/** Playlist entries hold file names relative to the audio host; full URLs are used as they are. */
export const trackUrl = (url: string, base: string) => (url.startsWith('http') ? url : `${base}/${encodeURI(url)}`);

export function pickNext(index: number, length: number, mode: Mode, dir: 1 | -1, random: () => number = Math.random) {
  if (mode === 'shuffle' && length > 1) {
    let n = index;
    while (n === index) n = Math.floor(random() * length);
    return n;
  }
  return (((index + dir) % length) + length) % length;
}

export function formatTime(seconds: number) {
  if (!isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  return `${m}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
