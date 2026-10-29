import type { Database } from '../types';

const LIST_LIMIT = 40;

interface Span {
  from: string;
  to: string;
  /** No snapshot is old enough yet, so the oldest one is compared instead. */
  partial: boolean;
}

// Snapshots from before the latest redefinition of the indices are not comparable, so they are never the other side.
async function span(db: Database, board: string, days: number): Promise<Span | null> {
  const row = await db
    .prepare(
      `WITH same AS (
         SELECT day FROM aa_snapshots WHERE board = ?1
           AND epoch = (SELECT epoch FROM aa_snapshots WHERE board = ?1 ORDER BY day DESC LIMIT 1))
       SELECT (SELECT MAX(day) FROM same) AS last,
              (SELECT MAX(day) FROM same WHERE day <= date((SELECT MAX(day) FROM same), ?2)) AS back,
              (SELECT MIN(day) FROM same) AS first`,
    )
    .bind(board, `-${days} days`)
    .first<{ last: string | null; back: string | null; first: string | null }>();
  if (!row?.last || !row.first || row.first === row.last) return null;
  return row.back ? { from: row.back, to: row.last, partial: false } : { from: row.first, to: row.last, partial: true };
}

interface LlmChange {
  id: string;
  name: string;
  creator: string;
  release_date: string;
  was: number | null;
  now: number | null;
  was_metric: number | null;
  now_metric: number | null;
  was_price: number | null;
  now_price: number | null;
  added: number;
}

const METRIC_COLUMNS = new Set([
  'intelligence',
  'coding',
  'math',
  'price_blended',
  'price_input',
  'price_output',
  'tps',
  'ttft',
  'ttfat',
]);
const EVALUATION_KEY = /^[a-z][a-z0-9_]{0,40}$/;
export const DEFAULT_METRIC = 'intelligence';

/** SQL for one metric of the model in a table alias. The name is checked first, so it is safe to put in a query. */
export function metricSql(metric: string, alias: string): string | null {
  if (METRIC_COLUMNS.has(metric)) return `${alias}.${metric}`;
  return EVALUATION_KEY.test(metric) ? `json_extract(${alias}.evaluations, '$.${metric}')` : null;
}

async function llmChanges(db: Database, s: Span, metric: string) {
  const was = metricSql(metric, 'f')!;
  const now = metricSql(metric, 't')!;
  const changed = await db
    .prepare(
      `SELECT t.id, t.name, t.creator, t.release_date, f.intelligence AS was, t.intelligence AS now,
              ${was} AS was_metric, ${now} AS now_metric,
              f.price_blended AS was_price, t.price_blended AS now_price, f.id IS NULL AS added
       FROM aa_llm t LEFT JOIN aa_llm f ON f.day = ?2 AND f.id = t.id
       WHERE t.day = ?1 AND (f.id IS NULL OR ${was} IS NOT ${now} OR f.price_blended IS NOT t.price_blended)`,
    )
    .bind(s.to, s.from)
    .all<LlmChange>();
  const removed = await db
    .prepare(
      `SELECT f.id, f.name, f.creator, f.release_date, f.intelligence AS was FROM aa_llm f
       WHERE f.day = ?2 AND NOT EXISTS (SELECT 1 FROM aa_llm t WHERE t.day = ?1 AND t.id = f.id)
       ORDER BY f.intelligence DESC LIMIT ${LIST_LIMIT}`,
    )
    .bind(s.to, s.from)
    .all<Record<string, unknown>>();

  const rows = changed.results;
  const byGap = (gap: (r: LlmChange) => number) => (a: LlmChange, b: LlmChange) => Math.abs(gap(b)) - Math.abs(gap(a));
  const scoreGap = (r: LlmChange) => (r.now_metric ?? 0) - (r.was_metric ?? 0);
  const priceGap = (r: LlmChange) => ((r.now_price ?? 0) - (r.was_price ?? 0)) / (r.was_price || 1);
  return {
    ...s,
    metric,
    added: rows
      .filter((r) => r.added)
      .sort((a, b) => (b.now ?? -1) - (a.now ?? -1))
      .slice(0, LIST_LIMIT),
    removed: removed.results,
    rescored: rows
      .filter((r) => !r.added && r.was_metric !== r.now_metric)
      .sort(byGap(scoreGap))
      .slice(0, LIST_LIMIT),
    repriced: rows
      .filter((r) => !r.added && r.was_price !== r.now_price)
      .sort(byGap(priceGap))
      .slice(0, LIST_LIMIT),
  };
}

interface MediaChange {
  id: string;
  name: string;
  creator: string;
  was_rank: number | null;
  now_rank: number | null;
  was: number | null;
  now: number | null;
  added: number;
}

async function mediaChanges(db: Database, board: string, s: Span) {
  const changed = await db
    .prepare(
      `SELECT t.id, t.name, t.creator, f.rank AS was_rank, t.rank AS now_rank, f.elo AS was, t.elo AS now,
              f.id IS NULL AS added
       FROM aa_media t LEFT JOIN aa_media f ON f.day = ?2 AND f.board = t.board AND f.id = t.id
       WHERE t.day = ?1 AND t.board = ?3 AND (f.id IS NULL OR f.rank IS NOT t.rank OR f.elo IS NOT t.elo)
       ORDER BY t.rank`,
    )
    .bind(s.to, s.from, board)
    .all<MediaChange>();
  const removed = await db
    .prepare(
      `SELECT f.id, f.name, f.creator, f.rank AS was_rank, f.elo AS was FROM aa_media f
       WHERE f.day = ?2 AND f.board = ?3
         AND NOT EXISTS (SELECT 1 FROM aa_media t WHERE t.day = ?1 AND t.board = f.board AND t.id = f.id)
       ORDER BY f.rank LIMIT ${LIST_LIMIT}`,
    )
    .bind(s.to, s.from, board)
    .all<Record<string, unknown>>();
  const rows = changed.results;
  return {
    ...s,
    added: rows.filter((r) => r.added).slice(0, LIST_LIMIT),
    removed: removed.results,
    moved: rows
      .filter((r) => !r.added && r.was_rank !== r.now_rank)
      .sort((a, b) => Math.abs((b.was_rank ?? 0) - (b.now_rank ?? 0)) - Math.abs((a.was_rank ?? 0) - (a.now_rank ?? 0)))
      .slice(0, LIST_LIMIT),
  };
}

export async function changes(db: Database, days: number, metric: string) {
  const boards = await db.prepare('SELECT DISTINCT board FROM aa_snapshots ORDER BY board').all<{ board: string }>();
  const media: Record<string, Awaited<ReturnType<typeof mediaChanges>>> = {};
  let llm = null;
  for (const { board } of boards.results) {
    const s = await span(db, board, days);
    if (!s) continue;
    if (board === 'llm') llm = await llmChanges(db, s, metric);
    else media[board] = await mediaChanges(db, board, s);
  }
  return { days, llm, media };
}
