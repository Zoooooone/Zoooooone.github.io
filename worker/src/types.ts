interface Statement {
  bind(...values: unknown[]): Statement;
  run(): Promise<unknown>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
}

export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown>;
}

export interface Env {
  DB: Database;
  /** Comma-separated list of origins allowed to report, e.g. https://zoooooone.github.io */
  ALLOWED_ORIGINS: string;
  HASH_SECRET: string;
  /** Bearer token that unlocks the read-only stats API. Without it the API does not exist. */
  STATS_TOKEN?: string;
}
