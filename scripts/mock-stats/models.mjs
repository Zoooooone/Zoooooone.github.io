// Made-up model lists in the shape the stats Worker returns under /api/models/.
// Every name here is invented: real Artificial Analysis data must not be committed to this public repository.
const DAY = 24 * 60 * 60 * 1000;

let seed = 20261024;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const between = (lo, hi) => lo + random() * (hi - lo);
const round = (n, digits = 1) => Math.round(n * 10 ** digits) / 10 ** digits;
const sometimes = (chance, value) => (random() < chance ? value : null);

const CREATORS = [
  ['Northwind', 6],
  ['Bluebird Labs', 5],
  ['Kestrel AI', 4],
  ['Orchid', 3],
  ['Quanta', 2],
  ['Meridian', 1],
  ['Tessellate', 0],
  ['Lumen Works', -1],
  ['Halcyon', -2],
];
const VARIANTS = [[''], ['High', 'Low'], ['Max', 'High', 'Minimal']];
const BENCHMARKS = [
  'gpqa',
  'hle',
  'mmlu_pro',
  'lcr',
  'ifbench',
  'livecodebench',
  'scicode',
  'terminalbench_v4_0',
  'tau2',
];
const START = Date.UTC(2023, 0, 1);

const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.parse(today) - n * DAY).toISOString().slice(0, 10);

function makeLlm() {
  const list = [];
  let n = 0;
  for (const [creator, bonus] of CREATORS) {
    for (let family = 0; family < 7; family++) {
      const released = START + random() * (Date.parse(today) - START);
      const months = (released - START) / (30 * DAY);
      const retired = released < Date.UTC(2025, 0, 1) && random() < 0.6;
      const base = Math.min(62, 12 + months * 1.05 + bonus + between(-4, 4));
      const variants = VARIANTS[Math.floor(random() * VARIANTS.length)];
      const price = round(Math.exp(between(Math.log(0.05), Math.log(30))), 2);
      variants.forEach((variant, i) => {
        const intelligence = round(Math.max(5, base - i * between(2, 6)));
        const name = `${creator.split(' ')[0]} ${family + 1}${variant ? ` (${variant})` : ''}`;
        list.push({
          id: `mock-${++n}`,
          name,
          slug: name.toLowerCase().replace(/\W+/g, '-'),
          creator_id: creator,
          creator,
          release_date: new Date(released).toISOString().slice(0, 10),
          intelligence: sometimes(0.97, intelligence),
          coding: sometimes(0.5, round(intelligence * between(0.8, 1.1))),
          math: sometimes(0.5, round(intelligence * between(0.9, 1.3))),
          price_blended: retired ? null : price,
          price_input: retired ? null : round(price / 2, 2),
          price_output: retired ? null : round(price * 2.5, 2),
          tps: retired ? null : round(between(20, 400), 0),
          ttft: retired ? null : round(variant === 'Max' ? between(20, 200) : between(0.3, 4), 2),
          ttfat: retired ? null : round(variant === 'Max' ? between(20, 200) : between(0.3, 4), 2),
          evaluations: Object.fromEntries(
            BENCHMARKS.map((key) => [
              key,
              sometimes(0.7, round(Math.min(0.98, intelligence / 70 + between(-0.1, 0.1)), 3)),
            ]),
          ),
        });
      });
    }
  }
  return list;
}

const MEDIA_SIZES = {
  'text-to-image': 24,
  'image-editing': 18,
  'text-to-speech': 20,
  'text-to-video': 14,
  'image-to-video': 16,
};
const CATEGORIES = {
  'text-to-image': ['Anime', 'Photorealistic', 'Fantasy & Mythical'],
  'text-to-video': ['Cartoon and anime', 'Photorealistic', '3D Render/CGI'],
  'image-to-video': ['Cartoon and anime', 'Photorealistic'],
};

function makeMedia() {
  return Object.fromEntries(
    Object.entries(MEDIA_SIZES).map(([board, size]) => {
      const models = Array.from({ length: size }, (_, i) => {
        const elo = Math.round(1300 - i * between(6, 18));
        const creator = CREATORS[Math.floor(random() * CREATORS.length)][0];
        return {
          id: `${board}-${i}`,
          name: `${creator.split(' ')[0]} ${board.split('-').pop()} ${i + 1}`,
          slug: `${board}-${i}`,
          creator,
          release_date:
            board === 'text-to-speech' ? '' : `202${4 + Math.floor(random() * 3)}-0${1 + Math.floor(random() * 9)}`,
          elo,
          rank: i + 1,
          ci95: `-${Math.round(between(8, 30))}/${Math.round(between(8, 30))}`,
          appearances: board === 'text-to-speech' ? null : Math.round(between(800, 20000)),
          categories: (CATEGORIES[board] ?? []).map((style) => ({
            style_category: style,
            subject_matter_category: null,
            format_category: null,
            elo: elo + Math.round(between(-40, 40)),
            ci95: '-30/30',
            appearances: Math.round(between(100, 3000)),
          })),
        };
      });
      return [board, models];
    }),
  );
}

const llm = makeLlm();
const media = makeMedia();
const now = Date.now();

export const latest = () => ({
  boards: ['llm', ...Object.keys(media)].map((board) => ({
    board,
    day: board === 'text-to-speech' ? daysAgo(1) : today,
    fetched_at: now - 2 * 60 * 60 * 1000,
    models: board === 'llm' ? llm.length : media[board].length,
  })),
  runs: [
    { board: 'text-to-speech', ts: now - 60 * 60 * 1000, ok: 0, models: null, error: 'HTTP 500' },
    { board: 'llm', ts: now - 2 * 60 * 60 * 1000, ok: 1, models: llm.length, error: '' },
  ],
  daily: [3, 2, 1, 0].map((n) => ({
    day: daysAgo(n),
    top: round(Math.max(...llm.map((m) => m.intelligence ?? 0)) - n * 0.4),
    models: llm.length - n,
  })),
  llm,
  media,
});

const scored = llm.filter((m) => m.intelligence != null);
const priced = llm.filter((m) => m.price_blended != null);
const change = (m, extra) => ({ id: m.id, name: m.name, creator: m.creator, release_date: m.release_date, ...extra });

const metricOf = (model, key) => model[key] ?? model.evaluations[key] ?? null;

const nudged = (key) => llm.filter((m) => metricOf(m, key) != null).slice(3, 7);

const arenaChange = (board) => {
  const list = media[board];
  return {
    added: [{ ...list[1], was_rank: null, now_rank: 2, was: null, now: list[1].elo }],
    removed: board === 'text-to-speech' ? [{ ...list[5], was_rank: 6, was: list[5].elo }] : [],
    moved: [{ ...list[0], was_rank: 3, now_rank: 1, was: list[0].elo - 20, now: list[0].elo }],
  };
};

export const changes = (days, metric = 'intelligence') => {
  const span = { from: daysAgo(days > 3 ? 3 : days), to: today, partial: days > 3 };
  const step = (key, i) => {
    const now = metricOf(
      llm.find((m) => metricOf(m, key) != null),
      key,
    );
    return now == null ? 1 : Math.abs(now) < 5 ? 0.02 * (i + 1) : (i + 1) * 1.5;
  };
  return {
    days,
    llm: {
      ...span,
      metric,
      added: scored
        .slice(0, 3)
        .map((m) => change(m, { was: null, now: m.intelligence, was_price: null, now_price: m.price_blended })),
      removed: [
        { id: 'mock-old-1', name: 'Halcyon 0 (Legacy)', creator: 'Halcyon', release_date: '2023-02-01', was: 14.2 },
      ],
      rescored: nudged(metric).map((m, i) =>
        change(m, {
          was_metric: metricOf(m, metric) - (i % 2 ? -1 : 1) * step(metric, i),
          now_metric: metricOf(m, metric),
        }),
      ),
      repriced: priced
        .slice(0, 4)
        .map((m, i) =>
          change(m, { was_price: round(m.price_blended * (i % 2 ? 0.5 : 2), 2), now_price: m.price_blended }),
        ),
    },
    media: Object.fromEntries(Object.keys(media).map((board) => [board, { ...span, ...arenaChange(board) }])),
  };
};

export const history = (id) => {
  const model = llm.find((m) => m.id === id);
  if (!model) return { id, days: [] };
  return {
    id,
    days: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => ({
      day: daysAgo(n),
      name: model.name,
      intelligence: model.intelligence == null ? null : round(model.intelligence - n * 0.2),
      coding: model.coding,
      math: model.math,
      price_blended: model.price_blended == null ? null : round(model.price_blended * (n > 5 ? 1.5 : 1), 2),
      tps: model.tps,
      ttft: model.ttft,
    })),
  };
};
