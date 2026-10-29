import { integer, json, type ResponseHeaders } from '../stats/shared';
import type { Database } from '../types';
import { changes, DEFAULT_METRIC, metricSql } from './changes';

const LLM_OBJECT = `json_object('id', id, 'name', name, 'slug', slug, 'creator_id', creator_id, 'creator', creator,
  'release_date', release_date, 'intelligence', intelligence, 'coding', coding, 'math', math,
  'price_blended', price_blended, 'price_input', price_input, 'price_output', price_output,
  'tps', tps, 'ttft', ttft, 'ttfat', ttfat, 'evaluations', json(evaluations),
  'intelligence_legacy', intelligence_legacy, 'coding_legacy', coding_legacy, 'math_legacy', math_legacy)`;

const MEDIA_OBJECT = `json_object('id', id, 'name', name, 'slug', slug, 'creator', creator,
  'release_date', release_date, 'elo', elo, 'rank', rank, 'ci95', ci95, 'appearances', appearances,
  'categories', json(categories))`;

const LEGACY_LLM = `SELECT t.*, o.intelligence AS intelligence_legacy, o.coding AS coding_legacy, o.math AS math_legacy
  FROM aa_llm t LEFT JOIN aa_llm o ON o.day = ?2 AND o.id = t.id WHERE t.day = ?1`;

const MODEL_ID = /^[\w-]{1,64}$/;
const DAILY_DAYS = 30;

/** Answers with JSON text that SQLite already built, so the Worker never parses or re-serialises the 0.5 MB model list. */
const prebuilt = (body: string, headers: ResponseHeaders) =>
  new Response(body, { headers: { ...headers, 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function latest(db: Database): Promise<string> {
  // SQLite returns the other columns from the row that holds MAX(day).
  const boards = await db
    .prepare('SELECT board, MAX(day) AS day, fetched_at, models FROM aa_snapshots GROUP BY board ORDER BY board')
    .all<{ board: string; day: string; fetched_at: number; models: number }>();
  const runs = await db
    .prepare('SELECT board, ts, ok, models, error FROM aa_runs ORDER BY ts DESC LIMIT 30')
    .all<Record<string, unknown>>();
  const daily = await db
    .prepare(
      `SELECT day, top, models, epoch FROM
         (SELECT day, top, models, epoch FROM aa_snapshots WHERE board = 'llm' ORDER BY day DESC LIMIT ${DAILY_DAYS})
       ORDER BY day`,
    )
    .all<Record<string, unknown>>();

  const llmDay = boards.results.find((b) => b.board === 'llm')?.day;
  const index = llmDay
    ? await db
        .prepare(
          `SELECT MIN(day) AS since, (SELECT MAX(day) FROM aa_snapshots WHERE board = 'llm' AND epoch < s.epoch) AS legacy
           FROM aa_snapshots s WHERE board = 'llm'
             AND epoch = (SELECT epoch FROM aa_snapshots WHERE board = 'llm' AND day = ?1)`,
        )
        .bind(llmDay)
        .first<{ since: string; legacy: string | null }>()
    : null;
  const llm = llmDay
    ? await db
        .prepare(`SELECT json_group_array(${LLM_OBJECT}) AS list FROM (${LEGACY_LLM})`)
        .bind(llmDay, index?.legacy ?? null)
        .first<{ list: string }>()
    : null;
  const media = await db
    .prepare(
      `SELECT m.board, json_group_array(${MEDIA_OBJECT}) AS list
       FROM aa_media m JOIN (SELECT board AS b, MAX(day) AS d FROM aa_snapshots WHERE board != 'llm' GROUP BY board)
         ON m.board = b AND m.day = d
       GROUP BY m.board`,
    )
    .all<{ board: string; list: string }>();

  const mediaJson = media.results.map((r) => `${JSON.stringify(r.board)}:${r.list}`).join(',');
  return `{"boards":${JSON.stringify(boards.results)},"runs":${JSON.stringify(runs.results)},"daily":${JSON.stringify(
    daily.results,
  )},"index":${JSON.stringify(index?.legacy ? index : null)},"llm":${llm?.list ?? '[]'},"media":{${mediaJson}}}`;
}

async function history(db: Database, id: string) {
  const rows = await db
    .prepare(
      `SELECT l.day, l.name, l.intelligence, l.coding, l.math, l.price_blended, l.tps, l.ttft, s.epoch
       FROM aa_llm l JOIN aa_snapshots s ON s.board = 'llm' AND s.day = l.day
       WHERE l.id = ? ORDER BY l.day`,
    )
    .bind(id)
    .all<Record<string, unknown>>();
  return { id, days: rows.results };
}

/** The caller has already checked the token. */
export async function handleModels(db: Database, url: URL, headers: ResponseHeaders): Promise<Response> {
  if (url.pathname === '/api/models/latest') return prebuilt(await latest(db), headers);
  if (url.pathname === '/api/models/changes') {
    const metric = url.searchParams.get('metric') ?? DEFAULT_METRIC;
    if (!metricSql(metric, 't')) return new Response(null, { status: 400, headers });
    return json(await changes(db, integer(url.searchParams.get('days'), 1, 3650, 7), metric), headers);
  }
  if (url.pathname === '/api/models/history') {
    const id = url.searchParams.get('id') ?? '';
    if (!MODEL_ID.test(id)) return new Response(null, { status: 400, headers });
    return json(await history(db, id), headers);
  }
  return new Response(null, { status: 404, headers });
}
