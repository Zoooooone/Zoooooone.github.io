import { thumb } from '@/lib/assets/thumb';
import { audioBase } from '@/config/site';

type Track = { name: string; artist: string; url: string; cover?: string; lrc?: string };
type Lyric = { t: number; text: string };
type Mode = 'list' | 'shuffle' | 'single';

const PLAYLIST = '/assets/audio/playlist/playlist1.json';
const STORE = 'player';

const el = document.getElementById('player');
if (el) {
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
  const btnList = $<HTMLButtonElement>('.pl-listbtn');
  const panel = document.getElementById('pl-panel')!;
  const listEl = panel.querySelector<HTMLOListElement>('.pl-list')!;
  const vols = [...document.querySelectorAll<HTMLInputElement>('.pl-vol')];
  const btnMute = $<HTMLButtonElement>('.pl-mute');

  let tracks: Track[] = [];
  let index = 0;
  let mode: Mode = 'list';
  let lyrics: Lyric[] = [];
  let lyricIdx = -1;
  let seeking = false;

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const thumbOf = (src?: string) => thumb(src, 800) ?? '';

  const save = () => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ i: index, t: audio.currentTime || 0, v: audio.volume, m: mode }));
    } catch {}
  };

  const parseLrc = (text: string): Lyric[] => {
    const out: Lyric[] = [];
    for (const line of text.split(/\r?\n/)) {
      const stamps = [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
      const content = line.replace(/\[[^\]]*\]/g, '').trim();
      if (!stamps.length || !content) continue;
      for (const s of stamps) out.push({ t: Number(s[1]) * 60 + Number(s[2]), text: content });
    }
    return out.sort((a, b) => a.t - b.t);
  };

  const setLyric = (text: string) => {
    if (lyricEl.dataset.text === text) return;
    lyricEl.dataset.text = text;
    lyricEl.classList.remove('swap');
    void lyricEl.offsetWidth;
    lyricEl.textContent = text;
    lyricEl.classList.add('swap');
  };

  const renderList = () => {
    listEl.innerHTML = '';
    const count = panel.querySelector('.pl-count');
    if (count) count.textContent = `${tracks.length} TRACKS`;
    tracks.forEach((t, i) => {
      const li = document.createElement('li');
      li.className = i === index ? 'on' : '';
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.i = String(i);
      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = String(i + 1).padStart(2, '0');
      const cv = document.createElement('span');
      cv.className = 'cv';
      if (t.cover) {
        const im = document.createElement('img');
        im.loading = 'lazy';
        im.decoding = 'async';
        im.alt = '';
        im.src = thumbOf(t.cover);
        cv.append(im);
      }
      const tx = document.createElement('span');
      tx.className = 'tx';
      const name = document.createElement('span');
      name.className = 'nm';
      name.textContent = `${t.name}`;
      const ar = document.createElement('span');
      ar.className = 'ar';
      ar.textContent = t.artist;
      tx.append(name, ar);
      b.append(n, cv, tx);
      li.append(b);
      listEl.append(li);
    });
  };

  const setMedia = (t: Track) => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.name,
      artist: t.artist,
      artwork: t.cover ? [{ src: thumbOf(t.cover), sizes: '800x800' }] : [],
    });
  };

  const load = async (i: number, { play = false, at = 0 } = {}) => {
    if (!tracks.length) return;
    index = (i + tracks.length) % tracks.length;
    const t = tracks[index];

    audio.src = t.url.startsWith('http') ? t.url : `${audioBase}/${encodeURI(t.url)}`;
    audio.currentTime = at;
    cover.src = thumbOf(t.cover);
    cover.alt = t.name;
    title.textContent = t.name;
    artist.textContent = t.artist;
    el.dataset.hasCover = t.cover ? '1' : '0';
    dur.textContent = '0:00';
    fill.style.transform = 'scaleX(0)';
    lyrics = [];
    lyricIdx = -1;
    setLyric('');
    renderList();
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

  const next = (dir: 1 | -1 = 1) => {
    if (mode === 'shuffle' && tracks.length > 1) {
      let n = index;
      while (n === index) n = Math.floor(Math.random() * tracks.length);
      void load(n, { play: true });
    } else {
      void load(index + dir, { play: true });
    }
  };

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

  btnPlay.addEventListener('click', toggle);
  btnPrev.addEventListener('click', () => {
    if (audio.currentTime > 3) audio.currentTime = 0;
    else next(-1);
  });
  btnNext.addEventListener('click', () => next(1));
  btnMode.addEventListener('click', () => {
    mode = mode === 'list' ? 'shuffle' : mode === 'shuffle' ? 'single' : 'list';
    paintMode();
    save();
  });
  const placePanel = () => {
    const bar = el.closest('.topbar');
    if (!bar) return;
    if (window.matchMedia('(max-width: 860px)').matches) {
      panel.style.top = '';
      panel.style.right = '';
      return;
    }
    const r = bar.getBoundingClientRect();
    panel.style.top = `${Math.round(r.bottom + 8)}px`;
    panel.style.right = `${Math.max(8, Math.round(window.innerWidth - r.right))}px`;
  };
  const setPanel = (open: boolean) => {
    if (open) placePanel();
    panel.hidden = !open;
    btnList.setAttribute('aria-expanded', String(open));
  };
  window.addEventListener('resize', () => !panel.hidden && placePanel());
  btnList.addEventListener('click', (e) => {
    e.stopPropagation();
    setPanel(Boolean(panel.hidden));
  });
  document.addEventListener('click', (e) => {
    if (panel.hidden) return;
    const t = e.target as Node;
    if (!panel.contains(t) && !btnList.contains(t)) setPanel(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) setPanel(false);
  });
  listEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-i]');
    if (b) void load(Number(b.dataset.i), { play: true });
  });
  const paintMute = () => {
    btnMute.setAttribute('aria-pressed', String(audio.muted));
    btnMute.title = audio.muted ? '取消静音' : '静音';
    btnMute.setAttribute('aria-label', btnMute.title);
  };
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
  audio.addEventListener('loadedmetadata', () => (dur.textContent = fmt(audio.duration)));
  audio.addEventListener('ended', () => {
    if (mode === 'single') {
      audio.currentTime = 0;
      void audio.play();
    } else next(1);
  });
  audio.addEventListener('timeupdate', () => {
    if (!seeking && isFinite(audio.duration) && audio.duration > 0) {
      fill.style.transform = `scaleX(${audio.currentTime / audio.duration})`;
    }
    cur.textContent = fmt(audio.currentTime);

    if (lyrics.length) {
      let i = lyricIdx;
      const t = audio.currentTime + 0.15;
      if (i < 0 || lyrics[i].t > t || (lyrics[i + 1] && lyrics[i + 1].t <= t)) {
        i = lyrics.findLastIndex((l) => l.t <= t);
      }
      if (i !== lyricIdx) {
        lyricIdx = i;
        setLyric(i >= 0 ? lyrics[i].text : '');
      }
    }
  });
  audio.addEventListener('error', () => setLyric('音频加载失败'));

  let lastSave = 0;
  audio.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastSave > 3000) {
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
    ms.setActionHandler('previoustrack', () => next(-1));
    ms.setActionHandler('nexttrack', () => next(1));
  }

  let saved: { i?: number; t?: number; v?: number; m?: Mode } = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORE) ?? '{}');
  } catch {}
  audio.volume = typeof saved.v === 'number' ? saved.v : 0.7;
  vols.forEach((v) => (v.value = String(audio.volume)));
  if (saved.m === 'shuffle' || saved.m === 'single' || saved.m === 'list') mode = saved.m;
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
