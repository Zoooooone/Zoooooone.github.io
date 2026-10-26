import { ApiError } from '@/scripts/stats/api';
import { BOARD_LABELS } from './metrics';
import type { Latest } from './types';

export function explain(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return '口令不正确';
    if (error.status === 404) return '接口未启用：Worker 还没有设置 STATS_TOKEN，或还没部署这个版本';
    return `Worker 返回了错误（${error.status}）`;
  }
  return '无法连接 Worker：网络不通，或当前网址不在 Worker 的 ALLOWED_ORIGINS 里';
}

const tokyoTime = (ms: number) =>
  new Date(ms).toLocaleString('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });

export function statusLine(latest: Latest): string {
  const llm = latest.boards.find((b) => b.board === 'llm');
  return llm
    ? `DATA ${llm.day} · FETCHED ${tokyoTime(llm.fetched_at)} TOKYO`
    : '还没有快照：Worker 在东京时间 6 点之后的整点抓取；之后仍为空请检查 AA_API_KEY 和数据库迁移';
}

const DAY_MS = 24 * 60 * 60 * 1000;
const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const STALE_DAYS = 2;
const EXPECTED_BY_HOUR = 8;

const newestRuns = (latest: Latest) => {
  const newest = new Map<string, Latest['runs'][number]>();
  for (const run of latest.runs) if (!newest.has(run.board)) newest.set(run.board, run);
  return newest;
};

const failingBoards = (latest: Latest) =>
  new Set([...newestRuns(latest).values()].filter((run) => !run.ok).map((run) => run.board));

function failures(latest: Latest): string[] {
  return [...newestRuns(latest).values()]
    .filter((run) => !run.ok)
    .map((run) => {
      const kept = latest.boards.find((b) => b.board === run.board)?.day;
      return `${BOARD_LABELS[run.board] ?? run.board} 最近一次拉取失败：${run.error}${kept ? `（显示的是 ${kept} 的数据）` : ''}`;
    });
}

export function staleness(latest: Latest, now = Date.now()): string[] {
  const tokyo = new Date(now + TOKYO_OFFSET_MS);
  const today = tokyo.toISOString().slice(0, 10);
  const failing = failingBoards(latest);
  return latest.boards
    .filter((b) => !failing.has(b.board))
    .flatMap((b) => {
      const behind = Math.round((Date.parse(today) - Date.parse(b.day)) / DAY_MS);
      const label = BOARD_LABELS[b.board] ?? b.board;
      if (behind >= STALE_DAYS) return [`${label} 已经 ${behind} 天没有更新（最新是 ${b.day}）`];
      if (behind === 1 && tokyo.getUTCHours() >= EXPECTED_BY_HOUR)
        return [`${label} 今天的数据还没抓到（最新是 ${b.day}）`];
      return [];
    });
}

export const warnings = (latest: Latest, now?: number) => [...failures(latest), ...staleness(latest, now)];
