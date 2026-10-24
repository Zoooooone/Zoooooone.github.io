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
  return llm ? `DATA ${llm.day} · FETCHED ${tokyoTime(llm.fetched_at)} TOKYO` : '还没有快照';
}

/** One line per board whose latest fetch failed, saying which day's data is still being shown. */
export function failures(latest: Latest): string[] {
  const newest = new Map<string, Latest['runs'][number]>();
  for (const run of latest.runs) if (!newest.has(run.board)) newest.set(run.board, run);
  return [...newest.values()]
    .filter((run) => !run.ok)
    .map((run) => {
      const kept = latest.boards.find((b) => b.board === run.board)?.day;
      return `${BOARD_LABELS[run.board] ?? run.board} 最近一次拉取失败：${run.error}${kept ? `（显示的是 ${kept} 的数据）` : ''}`;
    });
}
