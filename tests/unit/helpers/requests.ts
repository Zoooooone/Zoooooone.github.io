import { ORIGIN } from './worker-db';

export const TOKEN = 'secret-token';
export const UA = 'Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36';
export const IP = '203.0.113.9';

export function post(body: unknown, init: { origin?: string; ua?: string; ip?: string; cf?: object } = {}) {
  const request = new Request('https://worker.test/e', {
    method: 'POST',
    headers: { origin: init.origin ?? ORIGIN, 'user-agent': init.ua ?? UA, 'cf-connecting-ip': init.ip ?? IP },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  if (init.cf) Object.defineProperty(request, 'cf', { value: init.cf });
  return request;
}

export function get(path: string, init: { token?: string | null; origin?: string } = {}) {
  const headers: Record<string, string> = { origin: init.origin ?? ORIGIN };
  const token = init.token === undefined ? TOKEN : init.token;
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request(`https://worker.test${path}`, { headers });
}
