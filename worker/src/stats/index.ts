import { handleModels } from '../models/api';
import type { Env } from '../types';
import { integer, json, type ResponseHeaders } from './shared';
import { summary } from './summary';
import { visits } from './visits';

const DAY_MS = 24 * 60 * 60 * 1000;

// Compare digests so the check takes the same time wherever the first wrong character is.
async function tokenMatches(given: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all(
    [given, expected].map(
      async (value) => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))),
    ),
  );
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function handleStats(request: Request, env: Env, headers: ResponseHeaders): Promise<Response> {
  if (!env.STATS_TOKEN) return new Response(null, { status: 404, headers });

  const bearer = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '');
  if (!bearer || !(await tokenMatches(bearer[1], env.STATS_TOKEN))) {
    return new Response(null, { status: 401, headers });
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/models/')) return handleModels(env.DB, url, headers);
  const days = integer(url.searchParams.get('days'), 0, 3650, 30);
  const filters = { since: days ? Date.now() - days * DAY_MS : 0, bots: url.searchParams.get('bots') === '1' };

  if (url.pathname === '/api/summary') return json({ days, ...(await summary(env.DB, filters)) }, headers);
  if (url.pathname === '/api/visits') {
    const result = await visits(env.DB, filters, url.searchParams, headers);
    return result instanceof Response ? result : json(result, headers);
  }
  return new Response(null, { status: 404, headers });
}
