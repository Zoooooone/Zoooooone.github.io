import { collect } from './collect';
import { handleStats } from './stats';
import type { Env } from './types';

export type { Env } from './types';
export { hashIp } from './collect';

function cors(origin: string): Record<string, string> {
  return { 'access-control-allow-origin': origin, vary: 'origin' };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin') ?? '';
    const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    // sendBeacon always sends an Origin header, so a missing or foreign one is not our site.
    if (!allowed.includes(origin)) return new Response(null, { status: 403 });

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors(origin),
          'access-control-allow-methods': 'GET, POST',
          'access-control-allow-headers': 'content-type, authorization',
        },
      });
    }
    if (request.method === 'GET' && new URL(request.url).pathname.startsWith('/api/')) {
      return handleStats(request, env, cors(origin));
    }
    if (request.method !== 'POST') return new Response(null, { status: 405 });

    const status = await collect(request, env);
    return new Response(null, status === 204 ? { status, headers: cors(origin) } : { status });
  },
};
