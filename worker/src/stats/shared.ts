export interface Filters {
  since: number;
  bots: boolean;
}

export type ResponseHeaders = Record<string, string>;

export const json = (data: unknown, headers: ResponseHeaders) =>
  new Response(JSON.stringify(data), {
    headers: { ...headers, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export function integer(value: string | null, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return value !== null && Number.isInteger(n) ? Math.min(Math.max(n, min), max) : fallback;
}

export async function all<T extends Record<string, Promise<unknown>>>(
  queries: T,
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const settled = await Promise.all(Object.entries(queries).map(async ([name, query]) => [name, await query] as const));
  return Object.fromEntries(settled) as { [K in keyof T]: Awaited<T[K]> };
}
