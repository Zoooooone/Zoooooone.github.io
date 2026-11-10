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

// Legacy snapshots lack an official version, so detect a break from widespread score changes or missing scores.
const MIN_COMMON_FOR_BREAK = 10;
const MIN_SCORED_FOR_COLLAPSE = 20;

export const BOARDS = [
  { board: 'llm', path: 'language/models/free' },
  { board: 'text-to-image', path: 'media/text-to-image/models/free' },
  { board: 'image-editing', path: 'media/image-editing/models/free' },
  { board: 'text-to-speech', path: 'media/text-to-speech/models/free' },
  { board: 'text-to-video', path: 'media/text-to-video/models/free' },
  { board: 'image-to-video', path: 'media/image-to-video/models/free' },
] as const;

export type Board = (typeof BOARDS)[number]['board'];

export const tokyoDay = (ms: number) => new Date(ms + TOKYO_OFFSET_MS).toISOString().slice(0, 10);
const tokyoHour = (ms: number) => new Date(ms + TOKYO_OFFSET_MS).getUTCHours();

// SQLite reads the response directly: parsing a 0.6 MB list in the Worker would exceed the free plan's 10 ms of CPU time.
const INSPECT = `SELECT json_array_length(?1, '$.data') AS models,
    ?1 ->> '$.pagination.page' AS page, ?1 ->> '$.pagination.total_pages' AS pages,
    ?1 ->> '$.pagination.page_size' AS page_size, ?1 ->> '$.pagination.has_more' AS has_more,
    ?1 ->> '$.intelligence_index_version' AS version,
    (SELECT json_group_array(value ->> '$.id') FROM json_each(?1, '$.data')
       WHERE type = 'object' AND json_type(value, '$.id') = 'text' AND value ->> '$.id' <> ''
         AND json_type(value, '$.name') = 'text' AND value ->> '$.name' <> '') AS ids
  WHERE CASE WHEN json_valid(?1) THEN json_type(?1, '$.data') = 'array' END`;

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
    NULLIF(value ->> '$.performance.median_output_tokens_per_second', 0),
    NULLIF(value ->> '$.performance.median_time_to_first_token_seconds', 0),
    NULLIF(value ->> '$.performance.median_time_to_first_answer_token_seconds', 0),
    COALESCE(json(value -> '$.evaluations'), '{}')
  FROM json_each(?2, '$.data')`;

const INSERT_MEDIA = `INSERT OR REPLACE INTO aa_media (day, board, id, name, slug, creator, release_date,
    elo, rank, ci95, appearances, categories)
  SELECT ?1, ?2, value ->> '$.id', value ->> '$.name', COALESCE(value ->> '$.slug', ''),
    COALESCE(value ->> '$.model_creator.name', ''), COALESCE(value ->> '$.release_date', ''),
    value ->> '$.elo', COALESCE(value ->> '$.rank', RANK() OVER (ORDER BY value ->> '$.elo' DESC)),
    COALESCE(value ->> '$.ci95', CASE WHEN value ->> '$.ci_95' IS NOT NULL
      THEN printf('%g/%g', value ->> '$.ci_95', value ->> '$.ci_95') END, ''), value ->> '$.appearances',
    COALESCE(json(value -> '$.categories'), '[]')
  FROM json_each(?3, '$.data')`;

const BEFORE = `(SELECT MAX(day) FROM aa_snapshots WHERE board = 'llm' AND day < ?1)`;
const PREVIOUS_VERSION = `(SELECT intelligence_index_version FROM aa_snapshots WHERE board = 'llm' AND day = ${BEFORE})`;
const BOTH_SCORED = `FROM aa_llm t JOIN aa_llm o ON o.id = t.id AND o.day = ${BEFORE}
  WHERE t.day = ?1 AND t.intelligence IS NOT NULL AND o.intelligence IS NOT NULL`;
const EPOCH = `COALESCE((SELECT epoch FROM aa_snapshots WHERE board = 'llm' AND day = ${BEFORE}), 0) + CASE
    WHEN ${PREVIOUS_VERSION} IS NOT NULL THEN ${PREVIOUS_VERSION} <> ?5
    WHEN (SELECT COUNT(*) >= ${MIN_COMMON_FOR_BREAK} AND SUM(t.intelligence <> o.intelligence) * 2 > COUNT(*) ${BOTH_SCORED})
      OR (SELECT COUNT(intelligence) FROM aa_llm WHERE day = ${BEFORE}) >= ${MIN_SCORED_FOR_COLLAPSE}
        AND (SELECT COUNT(intelligence) FROM aa_llm WHERE day = ?1) * 5
          < (SELECT COUNT(intelligence) FROM aa_llm WHERE day = ${BEFORE})
    THEN 1 ELSE 0 END`;

const SNAPSHOT_ROW = {
  llm: `INSERT OR REPLACE INTO aa_snapshots (day, board, fetched_at, models, top, epoch, intelligence_index_version)
    VALUES (?1, ?2, ?3, ?4, (SELECT MAX(intelligence) FROM aa_llm WHERE day = ?1), ${EPOCH}, ?5)`,
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

interface PageInfo {
  models: number;
  page: number;
  pages: number;
  page_size: number;
  has_more: number;
  version: number;
  ids: string;
}

async function fetchBoard(db: Database, key: string, board: Board, path: string, fetcher: Fetcher) {
  const bodies: string[] = [];
  const ids = new Set<string>();
  let firstPage: PageInfo | undefined;
  for (let page = 1; page <= (firstPage?.pages ?? 1); page++) {
    const response = await fetcher(API + path + (page > 1 ? `?page=${page}` : ''), {
      headers: { 'x-api-key': key },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.text();
    if (body.length > MAX_BODY) throw new Error(`response too large (${body.length} bytes)`);

    const info = await db.prepare(INSPECT).bind(body).first<PageInfo>();
    if (!info) throw new Error('response is not JSON or has no data array');
    const pageIds = JSON.parse(info.ids) as string[];
    if (!pageIds.length) throw new Error('response lists no models');
    if (pageIds.length !== info.models) throw new Error('response lists invalid models');
    if (board === 'llm') {
      firstPage ??= info;
      if (
        info.page !== page ||
        !Number.isSafeInteger(info.pages) ||
        info.pages < page ||
        info.pages !== firstPage.pages ||
        !Number.isSafeInteger(info.page_size) ||
        info.page_size !== firstPage.page_size ||
        info.models > info.page_size ||
        info.has_more !== Number(page < info.pages) ||
        (info.has_more && info.models !== info.page_size) ||
        !Number.isFinite(info.version) ||
        info.version !== firstPage.version
      ) {
        throw new Error(`inconsistent pagination on page ${page}`);
      }
    }
    for (const id of pageIds) {
      if (ids.has(id)) throw new Error(`duplicate model ID on page ${page}`);
      ids.add(id);
    }
    bodies.push(body);
  }
  return { bodies, models: ids.size, version: firstPage?.version ?? null };
}

async function ingestBoard(
  db: Database,
  key: string,
  board: Board,
  path: string,
  day: string,
  now: number,
  fetcher: Fetcher,
) {
  const { bodies, models, version } = await fetchBoard(db, key, board, path, fetcher);
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
    board === 'llm'
      ? db.prepare('DELETE FROM aa_llm WHERE day = ?').bind(day)
      : db.prepare('DELETE FROM aa_media WHERE day = ? AND board = ?').bind(day, board),
    ...bodies.map((body) =>
      board === 'llm' ? db.prepare(INSERT_LLM).bind(day, body) : db.prepare(INSERT_MEDIA).bind(day, board, body),
    ),
    board === 'llm'
      ? db.prepare(SNAPSHOT_ROW.llm).bind(day, board, now, models, version)
      : db.prepare(SNAPSHOT_ROW.media).bind(day, board, now, models),
    db.prepare('INSERT INTO aa_runs (ts, board, ok, models) VALUES (?, ?, 1, ?)').bind(now, board, models),
  ]);
  return models;
}

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
