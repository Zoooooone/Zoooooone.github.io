import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { changes, history, latest } from './mock-stats/models.mjs';
import { summary, visits } from './mock-stats/queries.mjs';

const PORT = 8788;

createServer((request, response) => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization',
    'access-control-allow-methods': 'GET, POST',
  };
  if (request.method === 'OPTIONS') return response.writeHead(204, cors).end();

  const url = new URL(request.url, `http://localhost:${PORT}`);
  // Any token works, an empty one does not, so the sign-in screen can be tried as well.
  if (!/^Bearer .+/.test(request.headers.authorization ?? '')) return response.writeHead(401, cors).end();

  const days = Number(url.searchParams.get('days') ?? 30);
  const bots = url.searchParams.get('bots') === '1';
  const routes = {
    '/api/summary': () => summary({ days, bots }),
    '/api/visits': () => visits(url.searchParams),
    '/api/models/latest': () => latest(),
    '/api/models/changes': () =>
      changes(Number(url.searchParams.get('days') ?? 7), url.searchParams.get('metric') ?? undefined),
    '/api/models/history': () => history(url.searchParams.get('id') ?? ''),
  };
  const body = routes[url.pathname]?.() ?? null;
  if (!body) return response.writeHead(404, cors).end();
  response.writeHead(200, { ...cors, 'content-type': 'application/json' }).end(JSON.stringify(body));
}).listen(PORT, () => {
  console.log(`Fake stats Worker on http://localhost:${PORT} (any token works)`);
  // Lets the fake data be looked at without a second dev server, which Astro refuses to start.
  if (process.env.MOCK_ONLY) return;
  const dev = spawn('pnpm exec astro dev', {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PUBLIC_STATS_ENDPOINT: `http://localhost:${PORT}` },
  });
  dev.on('exit', (code) => process.exit(code ?? 0));
});
