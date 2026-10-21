CREATE TABLE IF NOT EXISTS visitors (
  id         TEXT PRIMARY KEY,
  first_seen INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL,
  visits     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS visits (
  pv          TEXT PRIMARY KEY,
  visitor_id  TEXT NOT NULL REFERENCES visitors(id),
  ts          INTEGER NOT NULL,
  path        TEXT NOT NULL,
  referrer    TEXT NOT NULL,
  country     TEXT NOT NULL,
  region      TEXT NOT NULL,
  city        TEXT NOT NULL,
  asn         INTEGER NOT NULL,
  as_org      TEXT NOT NULL,
  tz          TEXT NOT NULL,
  browser     TEXT NOT NULL,
  os          TEXT NOT NULL,
  device      TEXT NOT NULL,
  screen      TEXT NOT NULL,
  lang        TEXT NOT NULL,
  is_bot      INTEGER NOT NULL,
  ip_hash     TEXT NOT NULL,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS visits_ts ON visits (ts);
CREATE INDEX IF NOT EXISTS visits_visitor ON visits (visitor_id, ts);
CREATE INDEX IF NOT EXISTS visits_path ON visits (path, ts);
