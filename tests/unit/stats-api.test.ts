import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchSummary, fetchVisits } from '@/scripts/stats/api';

const ENDPOINT = 'https://worker.test';

function stubFetch(status = 200, body: unknown = {}) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const lastUrl = (mock: ReturnType<typeof stubFetch>) => new URL(String((mock.mock.calls[0] as unknown[])[0]));

afterEach(() => vi.unstubAllGlobals());

describe('stats API client', () => {
  it('sends the token as a bearer header and the range as a query', async () => {
    const mock = stubFetch();
    await fetchSummary(ENDPOINT, 'tok', { days: 7, bots: true });
    const url = lastUrl(mock);
    expect(url.pathname).toBe('/api/summary');
    expect(url.searchParams.get('days')).toBe('7');
    expect(url.searchParams.get('bots')).toBe('1');
    expect((mock.mock.calls[0] as unknown as [unknown, RequestInit])[1].headers).toEqual({
      authorization: 'Bearer tok',
    });
  });

  it('leaves out filters that are not set', async () => {
    const mock = stubFetch();
    await fetchSummary(ENDPOINT, 'tok', { days: 30, bots: false });
    expect([...lastUrl(mock).searchParams.keys()]).toEqual(['days']);
  });

  it('passes every visit filter and the cursor', async () => {
    const mock = stubFetch();
    await fetchVisits(ENDPOINT, 'tok', {
      days: 30,
      bots: false,
      path: '/a/',
      country: 'JP',
      first: true,
      before: 123,
    });
    const params = lastUrl(mock).searchParams;
    expect(params.get('path')).toBe('/a/');
    expect(params.get('country')).toBe('JP');
    expect(params.get('first')).toBe('1');
    expect(params.get('before')).toBe('123');
  });

  it("looks at a visitor's whole history whatever range is selected", async () => {
    const mock = stubFetch();
    await fetchVisits(ENDPOINT, 'tok', { days: 7, bots: false, visitor: 'a'.repeat(32) });
    expect(lastUrl(mock).searchParams.get('days')).toBe('0');
  });

  it('throws the status for a refused request', async () => {
    stubFetch(401);
    await expect(fetchSummary(ENDPOINT, 'bad', { days: 30, bots: false })).rejects.toMatchObject({
      status: 401,
    });
    await expect(fetchSummary(ENDPOINT, 'bad', { days: 30, bots: false })).rejects.toBeInstanceOf(ApiError);
  });

  it('returns the parsed body', async () => {
    stubFetch(200, { visits: [], next: null });
    expect(await fetchVisits(ENDPOINT, 'tok', { days: 30, bots: false })).toEqual({ visits: [], next: null });
  });
});
