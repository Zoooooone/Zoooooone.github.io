import { describe, expect, it } from 'vitest';
import worker from '../../worker/src/index';
import { BOARDS, ingestModels, tokyoDay } from '../../worker/src/models/ingest';
import { get, TOKEN } from './helpers/requests';
import { setup } from './helpers/worker-db';

const KEY = 'aa-test-key';
const at = (day: string, hour: number) => Date.parse(`${day}T${String(hour).padStart(2, '0')}:00:00+09:00`);

interface FakeLlm {
  id: string;
  name?: string;
  creator?: string;
  intelligence?: number | null;
  price?: number;
  tps?: number;
  gpqa?: number;
}
const llmBody = (models: FakeLlm[]) =>
  JSON.stringify({
    status: 200,
    prompt_options: { parallel_queries: 1, prompt_length: 1000 },
    data: models.map((m) => ({
      id: m.id,
      name: m.name ?? `Model ${m.id}`,
      slug: `model-${m.id}`,
      release_date: '2026-09-01',
      model_creator: { id: `c-${m.creator ?? 'acme'}`, name: m.creator ?? 'Acme', slug: m.creator ?? 'acme' },
      evaluations: {
        artificial_analysis_intelligence_index: m.intelligence ?? null,
        gpqa: m.gpqa ?? 0.5,
        new_bench: 0.25,
      },
      pricing: { price_1m_blended_3_to_1: m.price ?? 1, price_1m_input_tokens: 0.5, price_1m_output_tokens: 2 },
      median_output_tokens_per_second: m.tps ?? 100,
      median_time_to_first_token_seconds: 0.5,
      median_time_to_first_answer_token: 0,
    })),
  });

const mediaBody = (models: { id: string; rank: number; elo: number }[]) =>
  JSON.stringify({
    status: 200,
    data: models.map((m) => ({
      id: m.id,
      name: `Media ${m.id}`,
      slug: `media-${m.id}`,
      model_creator: { id: 'c-pix', name: 'Pixel Co' },
      elo: m.elo,
      rank: m.rank,
      ci95: '-10/10',
      appearances: 1000,
      release_date: '2026-08',
      categories: [{ style_category: 'Anime', subject_matter_category: null, format_category: null, elo: m.elo + 5 }],
    })),
  });

const DEFAULT_LLM = [
  { id: 'a', intelligence: 50, price: 4 },
  { id: 'b', intelligence: 40, price: 0, tps: 0 },
];
const DEFAULT_MEDIA = [
  { id: 'x', rank: 1, elo: 1200 },
  { id: 'y', rank: 2, elo: 1100 },
];

function fakeApi(bodies: Partial<Record<string, string | number>> = {}) {
  const calls: { url: string; key: string | null }[] = [];
  const fetcher = async (url: string, init: RequestInit) => {
    calls.push({ url, key: new Headers(init.headers).get('x-api-key') });
    const board = BOARDS.find((b) => url.endsWith(b.path))!.board;
    const body = bodies[board] ?? (board === 'llm' ? llmBody(DEFAULT_LLM) : mediaBody(DEFAULT_MEDIA));
    return typeof body === 'number' ? new Response('nope', { status: body }) : new Response(body);
  };
  return { calls, fetcher };
}

const world = () => setup({ STATS_TOKEN: TOKEN, AA_API_KEY: KEY });

describe('model snapshots', () => {
  it('uses Tokyo dates', () => {
    expect(tokyoDay(Date.parse('2026-10-23T15:30:00Z'))).toBe('2026-10-24');
  });

  it('does nothing without a key or before 06:00 Tokyo', async () => {
    const api = fakeApi();
    await ingestModels(setup().env, at('2026-10-24', 7), api.fetcher);
    await ingestModels(world().env, at('2026-10-24', 5), api.fetcher);
    expect(api.calls).toEqual([]);
  });

  it('stores every board once a day with the key, and skips the boards it already has', async () => {
    const { env, rows } = world();
    const api = fakeApi();
    const done = await ingestModels(env, at('2026-10-24', 6), api.fetcher);

    expect(done).toEqual({
      llm: 2,
      'text-to-image': 2,
      'image-editing': 2,
      'text-to-speech': 2,
      'text-to-video': 2,
      'image-to-video': 2,
    });
    expect(api.calls).toHaveLength(BOARDS.length);
    expect(api.calls.every((c) => c.key === KEY && c.url.startsWith('https://artificialanalysis.ai/api/v2/'))).toBe(
      true,
    );
    expect(rows('SELECT day, board, models FROM aa_snapshots')).toHaveLength(BOARDS.length);

    await ingestModels(env, at('2026-10-24', 7), api.fetcher);
    expect(api.calls).toHaveLength(BOARDS.length);
  });

  it('keeps the columns it needs and stores a price or speed of 0 as not measured', async () => {
    const { env, rows } = world();
    await ingestModels(env, at('2026-10-24', 6), fakeApi().fetcher);

    const [a, b] = rows<Record<string, unknown>>('SELECT * FROM aa_llm ORDER BY id');
    expect(a).toMatchObject({
      day: '2026-10-24',
      name: 'Model a',
      creator: 'Acme',
      intelligence: 50,
      price_blended: 4,
    });
    expect(JSON.parse(a.evaluations as string)).toMatchObject({ gpqa: 0.5, new_bench: 0.25 });
    expect(a.ttfat).toBeNull();
    expect(b).toMatchObject({ price_blended: null, tps: null });

    const media = rows<Record<string, unknown>>("SELECT * FROM aa_media WHERE board = 'text-to-video' ORDER BY rank");
    expect(media[0]).toMatchObject({ id: 'x', elo: 1200, rank: 1, ci95: '-10/10', creator: 'Pixel Co' });
    expect(JSON.parse(media[0].categories as string)[0].style_category).toBe('Anime');
  });

  it('logs a failed board and retries only that one an hour later', async () => {
    const { env, rows } = world();
    const done = await ingestModels(env, at('2026-10-24', 6), fakeApi({ 'text-to-speech': 500 }).fetcher);
    expect(done['text-to-speech']).toBe('HTTP 500');
    expect(rows('SELECT board FROM aa_runs WHERE ok = 0')).toEqual([{ board: 'text-to-speech' }]);

    const retry = fakeApi();
    await ingestModels(env, at('2026-10-24', 7), retry.fetcher);
    expect(retry.calls.map((c) => c.url)).toEqual([expect.stringContaining('text-to-speech')]);
  });

  it.each([
    ['text that is not JSON', 'Service unavailable', 'response is not JSON'],
    ['an empty list', JSON.stringify({ status: 200, data: [] }), 'response lists no models'],
    ['models without an id', JSON.stringify({ data: [{ name: 'x' }] }), 'response lists no models'],
  ])('refuses %s and stores nothing', async (_, body, error) => {
    const { env, rows } = world();
    const done = await ingestModels(env, at('2026-10-24', 6), fakeApi({ llm: body }).fetcher);
    expect(done.llm).toBe(error);
    expect(rows('SELECT * FROM aa_llm')).toEqual([]);
    expect(rows("SELECT * FROM aa_snapshots WHERE board = 'llm'")).toEqual([]);
  });

  it('refuses a list that suddenly lost more than half of its models', async () => {
    const { env, rows } = world();
    const many = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, intelligence: i }));
    await ingestModels(env, at('2026-10-23', 6), fakeApi({ llm: llmBody(many) }).fetcher);
    const done = await ingestModels(env, at('2026-10-24', 6), fakeApi({ llm: llmBody(many.slice(0, 4)) }).fetcher);
    expect(done.llm).toBe('only 4 models, down from 10');
    expect(rows("SELECT * FROM aa_llm WHERE day = '2026-10-24'")).toEqual([]);
  });
});

describe('model API', () => {
  async function twoDays() {
    const w = world();
    await ingestModels(
      w.env,
      at('2026-10-17', 6),
      fakeApi({
        llm: llmBody([
          { id: 'a', intelligence: 50, price: 4 },
          { id: 'b', intelligence: 40, price: 2 },
          { id: 'gone', intelligence: 30 },
        ]),
      }).fetcher,
    );
    await ingestModels(
      w.env,
      at('2026-10-24', 6),
      fakeApi({
        llm: llmBody([
          { id: 'a', intelligence: 52, price: 4, gpqa: 0.6 },
          { id: 'b', intelligence: 40, price: 1 },
          { id: 'new', intelligence: 60, creator: 'Newco' },
        ]),
        'text-to-video': mediaBody([
          { id: 'y', rank: 1, elo: 1210 },
          { id: 'x', rank: 2, elo: 1200 },
        ]),
      }).fetcher,
    );
    return w;
  }
  const call = async (env: ReturnType<typeof world>['env'], path: string) => {
    const res = await worker.fetch(get(path), env);
    expect(res.status).toBe(200);
    return res.json();
  };

  it('needs the stats token', async () => {
    const { env } = world();
    expect((await worker.fetch(get('/api/models/latest', { token: 'wrong' }), env)).status).toBe(401);
  });

  it('returns the newest list of every board', async () => {
    const { env } = await twoDays();
    const latest = await call(env, '/api/models/latest');
    expect(latest.llm.map((m: { id: string }) => m.id).sort()).toEqual(['a', 'b', 'new']);
    expect(latest.llm.find((m: { id: string }) => m.id === 'a')).toMatchObject({
      intelligence: 52,
      creator: 'Acme',
      evaluations: { gpqa: 0.6 },
    });
    expect(Object.keys(latest.media).sort()).toEqual(
      BOARDS.filter((b) => b.board !== 'llm')
        .map((b) => b.board)
        .sort(),
    );
    expect(latest.media['text-to-video'][0].categories[0].style_category).toBe('Anime');
    expect(latest.boards.find((b: { board: string }) => b.board === 'llm')).toMatchObject({
      day: '2026-10-24',
      models: 3,
    });
    expect(latest.daily).toEqual([
      { day: '2026-10-17', top: 50, models: 3 },
      { day: '2026-10-24', top: 60, models: 3 },
    ]);
  });

  it('answers with empty lists before the first snapshot', async () => {
    const latest = await call(world().env, '/api/models/latest');
    expect(latest).toMatchObject({ boards: [], llm: [], media: {}, daily: [] });
    expect(await call(world().env, '/api/models/changes')).toEqual({ days: 7, llm: null, media: {} });
  });

  it('lists what was added, removed, rescored and repriced', async () => {
    const { env } = await twoDays();
    const { llm, media } = await call(env, '/api/models/changes?days=7');
    expect(llm).toMatchObject({ from: '2026-10-17', to: '2026-10-24', partial: false });
    expect(llm.added.map((m: { id: string }) => m.id)).toEqual(['new']);
    expect(llm.removed.map((m: { id: string }) => m.id)).toEqual(['gone']);
    expect(llm).toMatchObject({ metric: 'intelligence' });
    expect(llm.rescored).toMatchObject([{ id: 'a', was_metric: 50, now_metric: 52 }]);
    expect(llm.repriced).toMatchObject([{ id: 'b', was_price: 2, now_price: 1 }]);
    expect(media['text-to-video'].moved.map((m: { id: string }) => m.id)).toEqual(['y', 'x']);
  });

  it('compares another metric when asked: a column, or a benchmark kept in the evaluations', async () => {
    const { env } = await twoDays();
    const speed = (await call(env, '/api/models/changes?metric=tps')).llm;
    expect(speed).toMatchObject({ metric: 'tps', rescored: [] });

    const benchmark = (await call(env, '/api/models/changes?metric=gpqa')).llm;
    expect(benchmark.rescored).toMatchObject([{ id: 'a', was_metric: 0.5, now_metric: 0.6 }]);
  });

  it.each(['x;drop table aa_llm', 'a b', "gpqa')--", 'A', ''])('refuses the metric %j', async (metric) => {
    const { env } = await twoDays();
    const res = await worker.fetch(get(`/api/models/changes?metric=${encodeURIComponent(metric)}`), env);
    expect(res.status).toBe(400);
  });

  it('compares with the oldest snapshot when none is old enough, and says so', async () => {
    const { env } = await twoDays();
    const { llm } = await call(env, '/api/models/changes?days=30');
    expect(llm).toMatchObject({ from: '2026-10-17', partial: true });
  });

  it('returns the history of one model and refuses odd ids', async () => {
    const { env } = await twoDays();
    const { days } = await call(env, '/api/models/history?id=a');
    expect(days.map((d: { intelligence: number }) => d.intelligence)).toEqual([50, 52]);
    expect((await worker.fetch(get('/api/models/history?id=a%27--'), env)).status).toBe(400);
  });
});
