import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { parseLrc } from '@/scripts/shell/player/lrc';
import type { Track } from '@/scripts/shell/player/playlist';

const publicFile = (url: string) => join(process.cwd(), 'public', url);

describe('About media assets', () => {
  it('has existing nonempty cover and lyric files for the playlist, with valid addition dates', async () => {
    const tracks: Track[] = JSON.parse(await readFile(publicFile('/assets/audio/playlist/playlist1.json'), 'utf8'));
    const playable = tracks.filter((track) => track.url);
    expect(new Set(playable.map((track) => track.url)).size).toBe(playable.length);
    for (const track of tracks) {
      if (track.addedAt) expect(track.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const url of [track.cover, track.lrc].filter((url): url is string => Boolean(url))) {
        expect((await stat(publicFile(url))).size).toBeGreaterThan(0);
      }
      if (track.cover) {
        const metadata = await sharp(publicFile(track.cover)).metadata();
        expect(metadata.width).toBeGreaterThan(0);
        expect(metadata.height).toBeGreaterThan(0);
      }
      if (track.lrc) expect(parseLrc(await readFile(publicFile(track.lrc), 'utf8')).length).toBeGreaterThan(0);
    }
  });

  it('matches gallery image dimensions and leaves no unused game image copies', async () => {
    const folder = publicFile('/assets/src/about_me/games');
    const games: { src: string; w: number; h: number }[] = JSON.parse(
      await readFile(join(folder, 'info.json'), 'utf8'),
    );
    const files = (await readdir(folder)).filter((name) => /\.(?:jpe?g|png|webp)$/i.test(name));
    expect(files.sort()).toEqual(games.map((game) => game.src.split('/').at(-1)!).sort());
    for (const game of games) {
      const metadata = await sharp(publicFile(game.src)).metadata();
      expect({ w: metadata.width, h: metadata.height }).toEqual({ w: game.w, h: game.h });
    }
  });
});
