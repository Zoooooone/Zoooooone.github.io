import { readdirSync, readFileSync } from 'node:fs';
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

const MIGRATIONS = new URL('../../../worker/migrations/', import.meta.url);

export const migrationFiles = () =>
  readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort();

// A real SQLite database built by the real migrations, so the SQL itself is tested and not only the JavaScript around it.
export function setup(overrides: Partial<Env> = {}, migrations = migrationFiles()) {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of migrations) sqlite.exec(readFileSync(new URL(file, MIGRATIONS), 'utf8'));

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
