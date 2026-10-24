import { ApiError } from '@/scripts/stats/api';
import type { Changes, History, Latest } from './types';

async function call<T>(endpoint: string, token: string, path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(new URL(path, endpoint), { headers: { authorization: `Bearer ${token}` }, signal });
  if (!res.ok) throw new ApiError(res.status);
  return res.json() as Promise<T>;
}

export const fetchLatest = (endpoint: string, token: string, signal?: AbortSignal) =>
  call<Latest>(endpoint, token, '/api/models/latest', signal);

export const fetchChanges = (endpoint: string, token: string, days: number, metric: string, signal?: AbortSignal) =>
  call<Changes>(endpoint, token, `/api/models/changes?days=${days}&metric=${encodeURIComponent(metric)}`, signal);

export const fetchHistory = (endpoint: string, token: string, id: string, signal?: AbortSignal) =>
  call<History>(endpoint, token, `/api/models/history?id=${encodeURIComponent(id)}`, signal);
