import { audioBase } from '@/config/site';
import { thumb } from '@/lib/assets/thumb';
import { lyricIndexAt, parseLrc, type Lyric } from './lrc';
import { createPanel } from './panel';
import { formatTime, isMode, nextMode, pickNext, trackUrl, type Mode, type Track } from './playlist';
import { readSaved, writeSaved } from './store';

const PLAYLIST = '/assets/audio/playlist/playlist1.json';
/** Show a lyric line slightly early so it is on screen when it is sung. */
const LYRIC_LEAD = 0.15;
const SAVE_EVERY_MS = 3000;
const DEFAULT_VOLUME = 0.7;

function init(el: HTMLElement) {
  const $ = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel)!;
  const audio = $<HTMLAudioElement>('audio');
  const cover = $<HTMLImageElement>('.pl-cover img');
  const title = $('.pl-title');
  const artist = $('.pl-artist');
  const lyricEl = $('.pl-lyric');
  const bar = $('.pl-bar');
  const fill = $('.pl-fill');
  const cur = $('.pl-cur');
  const dur = $('.pl-dur');
  const btnPlay = $<HTMLButtonElement>('.pl-play');
  const btnPrev = $<HTMLButtonElement>('.pl-prev');
  const btnNext = $<HTMLButtonElement>('.pl-next');
  const btnMode = $<HTMLButtonElement>('.pl-mode');
  const btnMute = $<HTMLButtonElement>('.pl-mute');
  const vols = [...document.querySelectorAll<HTMLInputElement>('.pl-vol')];

  let tracks: Track[] = [];
  let index = 0;
  let mode: Mode = 'list';
  let lyrics: Lyric[] = [];
  let lyricIdx = -1;
  let seeking = false;

  const coverOf = (src?: string) => thumb(src, 800) ?? '';

  const save = () => writeSaved({ i: index, t: audio.currentTime || 0, v: audio.volume, m: mode });

  const setLyric = (text: string) => {
    if (lyricEl.dataset.text === text) return;
    lyricEl.dataset.text = text;
    lyricEl.classList.remove('swap');
    void lyricEl.offsetWidth;
    lyricEl.textContent = text;
    lyricEl.classList.add('swap');
  };

  const setMedia = (t: Track) => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.name,
      artist: t.artist,
      artwork: t.cover ? [{ src: coverOf(t.cover), sizes: '800x800' }] : [],
    });
  };

  const load = async (i: number, { play = false, at = 0 } = {}) => {
    if (!tracks.length) return;
    index = (i + tracks.length) % tracks.length;
    const t = tracks[index];

    audio.src = trackUrl(t.url, audioBase);
    audio.currentTime = at;
    cover.src = coverOf(t.cover);
    cover.alt = t.name;
    title.textContent = t.name;
    artist.textContent = t.artist;
    el.dataset.hasCover = t.cover ? '1' : '0';
    dur.textContent = '0:00';
    fill.style.transform = 'scaleX(0)';
    lyrics = [];
    lyricIdx = -1;
    setLyric('');
    panel.render(tracks, index);
    setMedia(t);
    save();

    if (t.lrc) {
      try {
        const text = await (await fetch(encodeURI(t.lrc))).text();
        if (tracks[index] === t) lyrics = parseLrc(text);
      } catch {}
    }
    if (play) void audio.play().catch(() => {});
  };

  const panel = createPanel({
    player: el,
    panel: document.getElementById('pl-panel')!,
    button: $<HTMLButtonElement>('.pl-listbtn'),
    coverOf,
    onPick: (i) => void load(i, { play: true }),
  });

  const skip = (dir: 1 | -1) => void load(pickNext(index, tracks.length, mode, dir), { play: true });

  const toggle = () => {
    if (audio.paused) void audio.play().catch(() => {});
    else audio.pause();
  };

  const paintMode = () => {
    const label = { list: '列表循环', shuffle: '随机播放', single: '单曲循环' }[mode];
    btnMode.dataset.mode = mode;
    btnMode.title = label;
    btnMode.setAttribute('aria-label', `播放模式：${label}`);
  };

  const paintMute = () => {
    btnMute.setAttribute('aria-pressed', String(audio.muted));
    btnMute.title = audio.muted ? '取消静音' : '静音';
    btnMute.setAttribute('aria-label', btnMute.title);
  };

  btnPlay.addEventListener('click', toggle);
  btnPrev.addEventListener('click', () => {
    if (audio.currentTime > 3) audio.currentTime = 0;
    else skip(-1);
  });
  btnNext.addEventListener('click', () => skip(1));
  btnMode.addEventListener('click', () => {
    mode = nextMode(mode);
    paintMode();
    save();
  });

  vols.forEach((v) =>
    v.addEventListener('input', () => {
      audio.volume = Number(v.value);
      if (audio.muted && audio.volume > 0) audio.muted = false;
      vols.forEach((o) => (o.value = v.value));
      paintMute();
      save();
    }),
  );
  btnMute.addEventListener('click', () => {
    audio.muted = !audio.muted;
    paintMute();
  });

  const seekTo = (clientX: number) => {
    const r = bar.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    if (isFinite(audio.duration)) audio.currentTime = p * audio.duration;
    fill.style.transform = `scaleX(${p})`;
  };
  bar.addEventListener('pointerdown', (e) => {
    seeking = true;
    bar.setPointerCapture(e.pointerId);
    seekTo(e.clientX);
  });
  bar.addEventListener('pointermove', (e) => seeking && seekTo(e.clientX));
  bar.addEventListener('pointerup', () => (seeking = false));
  bar.addEventListener('pointercancel', () => (seeking = false));

  audio.addEventListener('play', () => {
    el.classList.add('playing');
    btnPlay.setAttribute('aria-label', '暂停');
  });
  audio.addEventListener('pause', () => {
    el.classList.remove('playing');
    btnPlay.setAttribute('aria-label', '播放');
    save();
  });
  audio.addEventListener('loadedmetadata', () => (dur.textContent = formatTime(audio.duration)));
  audio.addEventListener('ended', () => {
    if (mode === 'single') {
      audio.currentTime = 0;
      void audio.play();
    } else skip(1);
  });
  audio.addEventListener('error', () => setLyric('音频加载失败'));

  let lastSave = 0;
  audio.addEventListener('timeupdate', () => {
    if (!seeking && isFinite(audio.duration) && audio.duration > 0) {
      fill.style.transform = `scaleX(${audio.currentTime / audio.duration})`;
    }
    cur.textContent = formatTime(audio.currentTime);

    if (lyrics.length) {
      const i = lyricIndexAt(lyrics, audio.currentTime + LYRIC_LEAD, lyricIdx);
      if (i !== lyricIdx) {
        lyricIdx = i;
        setLyric(i >= 0 ? lyrics[i].text : '');
      }
    }

    const now = Date.now();
    if (now - lastSave > SAVE_EVERY_MS) {
      lastSave = now;
      save();
    }
  });
  window.addEventListener('pagehide', save);

  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-track]');
    if (!b || !tracks.length) return;
    e.preventDefault();
    const i = Number(b.dataset.track);
    if (i === index && !audio.paused) return;
    void load(i, { play: true });
  });

  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => void audio.play());
    ms.setActionHandler('pause', () => audio.pause());
    ms.setActionHandler('previoustrack', () => skip(-1));
    ms.setActionHandler('nexttrack', () => skip(1));
  }

  const saved = readSaved();
  audio.volume = typeof saved.v === 'number' ? saved.v : DEFAULT_VOLUME;
  vols.forEach((v) => (v.value = String(audio.volume)));
  if (isMode(saved.m)) mode = saved.m;
  paintMode();

  fetch(PLAYLIST)
    .then((r) => r.json() as Promise<Track[]>)
    .then((list) => {
      tracks = list;
      if (!tracks.length) throw new Error('empty playlist');
      const i = typeof saved.i === 'number' && saved.i < tracks.length ? saved.i : 0;
      void load(i, { at: saved.t ?? 0 });
    })
    .catch(() => {
      el.hidden = true;
    });
}

const root = document.getElementById('player');
if (root) init(root);
