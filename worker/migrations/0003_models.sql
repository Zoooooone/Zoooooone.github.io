CREATE TABLE IF NOT EXISTS aa_snapshots (
  day TEXT NOT NULL,
  board TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  models INTEGER NOT NULL,
  PRIMARY KEY (day, board)
);

CREATE TABLE IF NOT EXISTS aa_llm (
  day TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL DEFAULT '',
  creator_id TEXT NOT NULL DEFAULT '',
  creator TEXT NOT NULL DEFAULT '',
  release_date TEXT NOT NULL DEFAULT '',
  intelligence REAL,
  coding REAL,
  math REAL,
  price_blended REAL,
  price_input REAL,
  price_output REAL,
  tps REAL,
  ttft REAL,
  ttfat REAL,
  evaluations TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (day, id)
);
CREATE INDEX IF NOT EXISTS aa_llm_id ON aa_llm (id, day);

CREATE TABLE IF NOT EXISTS aa_media (
  day TEXT NOT NULL,
  board TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL DEFAULT '',
  creator TEXT NOT NULL DEFAULT '',
  release_date TEXT NOT NULL DEFAULT '',
  elo REAL,
  rank INTEGER,
  ci95 TEXT NOT NULL DEFAULT '',
  appearances INTEGER,
  categories TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (day, board, id)
);

CREATE TABLE IF NOT EXISTS aa_runs (
  ts INTEGER NOT NULL,
  board TEXT NOT NULL,
  ok INTEGER NOT NULL,
  models INTEGER,
  error TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS aa_runs_ts ON aa_runs (ts);
