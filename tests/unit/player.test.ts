import { describe, expect, it } from 'vitest';
import { loadLyrics, lyricIndexAt, parseLrc } from '@/scripts/shell/player/lrc';
import { formatTime, isMode, nextMode, pickNext, trackUrl } from '@/scripts/shell/player/playlist';
import { parseSaved } from '@/scripts/shell/player/store';

describe('parseLrc', () => {
  it('reads timestamps and text, sorted by time', () => {
    const lyrics = parseLrc('[00:12.50]second\n[00:03.00]first\n[01:01.00]third');
    expect(lyrics).toEqual([
      { t: 3, text: 'first' },
      { t: 12.5, text: 'second' },
      { t: 61, text: 'third' },
    ]);
  });

  it('supports repeated timestamps and skips empty or untimed lines', () => {
    const lyrics = parseLrc('[00:10.00][00:30.00]chorus\n[00:20.00]\nno timestamp\r\n[ar:artist]');
    expect(lyrics).toEqual([
      { t: 10, text: 'chorus' },
      { t: 30, text: 'chorus' },
    ]);
  });
});

describe('lyricIndexAt', () => {
  const lyrics = [
    { t: 5, text: 'a' },
    { t: 10, text: 'b' },
    { t: 20, text: 'c' },
  ];

  it('is -1 before the first line', () => {
    expect(lyricIndexAt(lyrics, 1, -1)).toBe(-1);
  });

  it('finds the current line and follows playback', () => {
    expect(lyricIndexAt(lyrics, 5, -1)).toBe(0);
    expect(lyricIndexAt(lyrics, 12, 0)).toBe(1);
    expect(lyricIndexAt(lyrics, 99, 1)).toBe(2);
  });

  it('keeps the hint while it is still right, and recovers after a seek backwards', () => {
    expect(lyricIndexAt(lyrics, 15, 1)).toBe(1);
    expect(lyricIndexAt(lyrics, 6, 2)).toBe(0);
  });
});

describe('playlist helpers', () => {
  it('cycles the play mode', () => {
    expect(nextMode('list')).toBe('shuffle');
    expect(nextMode('shuffle')).toBe('single');
    expect(nextMode('single')).toBe('list');
  });

  it('validates saved modes', () => {
    expect(isMode('shuffle')).toBe(true);
    expect(isMode('loop')).toBe(false);
    expect(isMode(undefined)).toBe(false);
  });

  it('resolves track URLs against the audio host', () => {
    expect(trackUrl('a b.mp3', 'https://cdn.example/audio')).toBe('https://cdn.example/audio/a%20b.mp3');
    expect(trackUrl('https://other.example/x.mp3', 'https://cdn.example/audio')).toBe('https://other.example/x.mp3');
  });

  it('wraps around in list mode and never repeats the current track in shuffle mode', () => {
    expect(pickNext(2, 3, 'list', 1)).toBe(0);
    expect(pickNext(0, 3, 'list', -1)).toBe(2);
    expect(pickNext(1, 3, 'single', 1)).toBe(2);
    const sequence = [0.0, 0.34, 0.7];
    let i = 0;
    const random = () => sequence[i++ % sequence.length];
    expect(pickNext(0, 3, 'shuffle', 1, random)).toBe(1);
    expect(pickNext(0, 1, 'shuffle', 1, random)).toBe(0);
  });

  it('formats times', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65.9)).toBe('1:05');
    expect(formatTime(Infinity)).toBe('0:00');
  });
});

describe('parseSaved', () => {
  it('keeps valid values', () => {
    expect(parseSaved({ i: 3, t: 12.5, v: 0.4, m: 'shuffle' })).toEqual({ i: 3, t: 12.5, v: 0.4, m: 'shuffle' });
  });

  it('returns nothing for values that are not objects', () => {
    for (const raw of [null, undefined, 7, 'x', true, []]) expect(parseSaved(raw)).toEqual({});
  });

  it('drops values of the wrong type or out of range', () => {
    const saved = parseSaved({ i: -1, t: Number.NaN, v: 2, m: 'loop' });
    expect(saved).toEqual({});
    expect(parseSaved({ i: 1.5, t: -3, v: -0.1 })).toEqual({});
    expect(parseSaved({ i: '2', t: '5', v: '0.5' })).toEqual({});
  });

  it('accepts the edges of the volume range', () => {
    expect(parseSaved({ v: 0 })).toEqual({ v: 0 });
    expect(parseSaved({ v: 1 })).toEqual({ v: 1 });
  });
});

describe('loadLyrics', () => {
  const reply = (text: string, ok = true) => (async () => ({ ok, text: async () => text }) as Response) as typeof fetch;

  it('returns the parsed lyrics while the track is still current', async () => {
    const lyrics = await loadLyrics('/a.lrc', () => true, reply('[00:01.00]one\n[00:02.00]two'));
    expect(lyrics).toEqual([
      { t: 1, text: 'one' },
      { t: 2, text: 'two' },
    ]);
  });

  it('drops lyrics that arrive after the track has changed', async () => {
    let current = true;
    const fetcher = (async () => {
      current = false;
      return { ok: true, text: async () => '[00:01.00]late' } as Response;
    }) as typeof fetch;
    expect(await loadLyrics('/a.lrc', () => current, fetcher)).toBeNull();
  });

  it('gives nothing for a missing file or a failed request', async () => {
    expect(await loadLyrics('/a.lrc', () => true, reply('not found', false))).toBeNull();
    const failing = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    expect(await loadLyrics('/a.lrc', () => true, failing)).toBeNull();
  });

  it('encodes the address it requests', async () => {
    let requested = '';
    const fetcher = (async (input: RequestInfo | URL) => {
      requested = String(input);
      return { ok: true, text: async () => '' } as Response;
    }) as typeof fetch;
    await loadLyrics('/audio/κ song.lrc', () => true, fetcher);
    expect(requested).toBe(encodeURI('/audio/κ song.lrc'));
  });
});
