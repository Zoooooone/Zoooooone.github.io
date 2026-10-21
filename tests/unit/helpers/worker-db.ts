import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { Env } from '../../../worker/src/index';

export const ORIGIN = 'https://site.test';

interface Fake {
  bind: (...values: unknown[]) => Fake;
  run: () => Promise<void>;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results: T[] }>;
  exec: () => void;
}

// A real SQLite database with the real schema, so the SQL itself is tested and not only the JavaScript around it.
export function setup(overrides: Partial<Env> = {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../../../worker/schema.sql', import.meta.url), 'utf8'));

  const statement = (sql: string, values: unknown[] = []): Fake => {
    const args = values as never[];
    return {
      bind: (...v) => statement(sql, v),
      run: async () => void sqlite.prepare(sql).run(...args),
      first: async <T>() => (sqlite.prepare(sql).get(...args) as T | undefined) ?? null,
      all: async <T>() => ({ results: sqlite.prepare(sql).all(...args) as T[] }),
      exec: () => void sqlite.prepare(sql).run(...args),
    };
  };

  const env: Env = {
    ALLOWED_ORIGINS: ORIGIN,
    HASH_SECRET: 's',
    DB: {
      prepare: (sql) => statement(sql),
      batch: async (list) => {
        sqlite.exec('BEGIN');
        try {
          for (const item of list as Fake[]) item.exec();
          sqlite.exec('COMMIT');
        } catch (error) {
          sqlite.exec('ROLLBACK');
          throw error;
        }
      },
    },
    ...overrides,
  };

  const rows = <T = Record<string, unknown>>(sql: string) => sqlite.prepare(sql).all() as T[];
  return { env, rows, sqlite };
}
