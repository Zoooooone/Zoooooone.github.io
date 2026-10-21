import type { Filters, Summary, VisitList } from './types';

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

interface Query extends Filters {
  days: number;
  bots: boolean;
  before?: number;
}

async function call<T>(endpoint: string, token: string, path: string, query: Query, signal?: AbortSignal): Promise<T> {
  const url = new URL(path, endpoint);
  url.searchParams.set('days', String(query.days));
  if (query.bots) url.searchParams.set('bots', '1');
  if (query.path) url.searchParams.set('path', query.path);
  if (query.country) url.searchParams.set('country', query.country);
  if (query.visitor) url.searchParams.set('visitor', query.visitor);
  if (query.first) url.searchParams.set('first', '1');
  if (query.before !== undefined) url.searchParams.set('before', String(query.before));

  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` }, signal });
  if (!res.ok) throw new ApiError(res.status);
  return res.json() as Promise<T>;
}

export const fetchSummary = (endpoint: string, token: string, query: Query, signal?: AbortSignal) =>
  call<Summary>(endpoint, token, '/api/summary', query, signal);

export const fetchVisits = (endpoint: string, token: string, query: Query, signal?: AbortSignal) =>
  call<VisitList>(endpoint, token, '/api/visits', { ...query, days: query.visitor ? 0 : query.days }, signal);
