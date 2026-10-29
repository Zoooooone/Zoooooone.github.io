import type { Database, Env } from '../types';

const API = 'https://artificialanalysis.ai/api/v2/';
const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const RUN_LOG_MS = 90 * 24 * 60 * 60 * 1000;
/** Tokyo hour of the first attempt each day; later hourly runs only retry what is missing. */
const FETCH_HOUR = 6;
// The whole response goes to SQLite as one value, and D1 refuses values over 2 MB.
const MAX_BODY = 1_900_000;
// A list that suddenly halves is more likely an API fault than models leaving, and would show up as mass removals.
// It is stored anyway once two attempts in a row see the same smaller count: a fault does not repeat itself exactly.
const MIN_SHARE_OF_PREVIOUS = 0.5;

// The composite indices are redefined now and then. A new epoch starts on the day when most models scored on both
// days changed their score, or when the scored models all but disappeared; only snapshots of one epoch are compared.
const MIN_COMMON_FOR_BREAK = 10;
const MIN_SCORED_FOR_COLLAPSE = 20;

export const BOARDS = [
  { board: 'llm', path: 'data/llms/models' },
  { board: 'text-to-image', path: 'data/media/text-to-image?include_categories=true' },
  { board: 'image-editing', path: 'data/media/image-editing' },
  { board: 'text-to-speech', path: 'data/media/text-to-speech' },
  { board: 'text-to-video', path: 'data/media/text-to-video?include_categories=true' },
  { board: 'image-to-video', path: 'data/media/image-to-video?include_categories=true' },
] as const;

export type Board = (typeof BOARDS)[number]['board'];

export const tokyoDay = (ms: number) => new Date(ms + TOKYO_OFFSET_MS).toISOString().slice(0, 10);
const tokyoHour = (ms: number) => new Date(ms + TOKYO_OFFSET_MS).getUTCHours();

// SQLite reads the response directly: parsing a 0.6 MB list in the Worker would exceed the free plan's 10 ms of CPU time.
const VALID_MODELS = `value ->> '$.id' IS NOT NULL AND value ->> '$.name' IS NOT NULL`;

const COUNT = `SELECT CASE WHEN json_valid(?1)
  THEN (SELECT COUNT(*) FROM json_each(?1, '$.data') WHERE ${VALID_MODELS}) END AS models`;

const INSERT_LLM = `INSERT OR REPLACE INTO aa_llm (day, id, name, slug, creator_id, creator, release_date,
    intelligence, coding, math, price_blended, price_input, price_output, tps, ttft, ttfat, evaluations)
  SELECT ?1, value ->> '$.id', value ->> '$.name', COALESCE(value ->> '$.slug', ''),
    COALESCE(value ->> '$.model_creator.id', ''), COALESCE(value ->> '$.model_creator.name', ''),
    COALESCE(value ->> '$.release_date', ''),
    value ->> '$.evaluations.artificial_analysis_intelligence_index',
    value ->> '$.evaluations.artificial_analysis_coding_index',
    value ->> '$.evaluations.artificial_analysis_math_index',
    NULLIF(value ->> '$.pricing.price_1m_blended_3_to_1', 0),
    NULLIF(value ->> '$.pricing.price_1m_input_tokens', 0),
    NULLIF(value ->> '$.pricing.price_1m_output_tokens', 0),
    NULLIF(value ->> '$.median_output_tokens_per_second', 0),
    NULLIF(value ->> '$.median_time_to_first_token_seconds', 0),
    NULLIF(value ->> '$.median_time_to_first_answer_token', 0),
    COALESCE(json(value -> '$.evaluations'), '{}')
  FROM json_each(?2, '$.data') WHERE ${VALID_MODELS}`;

const INSERT_MEDIA = `INSERT OR REPLACE INTO aa_media (day, board, id, name, slug, creator, release_date,
    elo, rank, ci95, appearances, categories)
  SELECT ?1, ?2, value ->> '$.id', value ->> '$.name', COALESCE(value ->> '$.slug', ''),
    COALESCE(value ->> '$.model_creator.name', ''), COALESCE(value ->> '$.release_date', ''),
    value ->> '$.elo', value ->> '$.rank', COALESCE(value ->> '$.ci95', ''), value ->> '$.appearances',
    COALESCE(json(value -> '$.categories'), '[]')
  FROM json_each(?3, '$.data') WHERE ${VALID_MODELS}`;

const BEFORE = `(SELECT MAX(day) FROM aa_snapshots WHERE board = 'llm' AND day < ?1)`;
const BOTH_SCORED = `FROM aa_llm t JOIN aa_llm o ON o.id = t.id AND o.day = ${BEFORE}
  WHERE t.day = ?1 AND t.intelligence IS NOT NULL AND o.intelligence IS NOT NULL`;
const EPOCH = `COALESCE((SELECT epoch FROM aa_snapshots WHERE board = 'llm' AND day = ${BEFORE}), 0) + CASE WHEN
    (SELECT COUNT(*) >= ${MIN_COMMON_FOR_BREAK} AND SUM(t.intelligence <> o.intelligence) * 2 > COUNT(*) ${BOTH_SCORED})
    OR (SELECT COUNT(intelligence) FROM aa_llm WHERE day = ${BEFORE}) >= ${MIN_SCORED_FOR_COLLAPSE}
      AND (SELECT COUNT(intelligence) FROM aa_llm WHERE day = ?1) * 5
        < (SELECT COUNT(intelligence) FROM aa_llm WHERE day = ${BEFORE})
  THEN 1 ELSE 0 END`;

const SNAPSHOT_ROW = {
  llm: `INSERT OR REPLACE INTO aa_snapshots (day, board, fetched_at, models, top, epoch)
    VALUES (?1, ?2, ?3, ?4, (SELECT MAX(intelligence) FROM aa_llm WHERE day = ?1), ${EPOCH})`,
  media: `INSERT OR REPLACE INTO aa_snapshots (day, board, fetched_at, models) VALUES (?1, ?2, ?3, ?4)`,
};

class Shrunk extends Error {
  constructor(
    readonly models: number,
    previous: number,
  ) {
    super(`only ${models} models, down from ${previous}`);
  }
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

async function ingestBoard(
  db: Database,
  key: string,
  board: Board,
  path: string,
  day: string,
  now: number,
  fetcher: Fetcher,
) {
  const response = await fetcher(API + path, {
    headers: { 'x-api-key': key },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.text();
  if (body.length > MAX_BODY) throw new Error(`response too large (${body.length} bytes)`);

  const models = (await db.prepare(COUNT).bind(body).first<{ models: number | null }>())?.models;
  if (models == null) throw new Error('response is not JSON');
  if (models === 0) throw new Error('response lists no models');
  const previous = await db
    .prepare('SELECT models FROM aa_snapshots WHERE board = ? ORDER BY day DESC LIMIT 1')
    .bind(board)
    .first<{ models: number }>();
  if (previous && models < previous.models * MIN_SHARE_OF_PREVIOUS) {
    const last = await db
      .prepare('SELECT ok, models FROM aa_runs WHERE board = ? ORDER BY ts DESC LIMIT 1')
      .bind(board)
      .first<{ ok: number; models: number | null }>();
    if (last?.ok !== 0 || last.models !== models) throw new Shrunk(models, previous.models);
  }

  await db.batch([
    board === 'llm' ? db.prepare(INSERT_LLM).bind(day, body) : db.prepare(INSERT_MEDIA).bind(day, board, body),
    db.prepare(SNAPSHOT_ROW[board === 'llm' ? 'llm' : 'media']).bind(day, board, now, models),
    db.prepare('INSERT INTO aa_runs (ts, board, ok, models) VALUES (?, ?, 1, ?)').bind(now, board, models),
  ]);
  return models;
}

/** Result per board: how many models were stored, or why it failed. */
export async function ingestModels(env: Env, now = Date.now(), fetcher: Fetcher = fetch) {
  const done: Partial<Record<Board, number | string>> = {};
  if (!env.AA_API_KEY || tokyoHour(now) < FETCH_HOUR) return done;

  const day = tokyoDay(now);
  const stored = await env.DB.prepare('SELECT board FROM aa_snapshots WHERE day = ?')
    .bind(day)
    .all<{ board: string }>();
  const have = new Set(stored.results.map((r) => r.board));
  const missing = BOARDS.filter((b) => !have.has(b.board));
  if (!missing.length) return done;

  for (const { board, path } of missing) {
    try {
      done[board] = await ingestBoard(env.DB, env.AA_API_KEY, board, path, day, now, fetcher);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      done[board] = message;
      await env.DB.prepare('INSERT INTO aa_runs (ts, board, ok, models, error) VALUES (?, ?, 0, ?, ?)')
        .bind(now, board, error instanceof Shrunk ? error.models : null, message.slice(0, 300))
        .run();
    }
  }
  await env.DB.prepare('DELETE FROM aa_runs WHERE ts < ?')
    .bind(now - RUN_LOG_MS)
    .run();
  return done;
}
