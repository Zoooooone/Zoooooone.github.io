ALTER TABLE aa_snapshots ADD COLUMN epoch INTEGER NOT NULL DEFAULT 0;
UPDATE aa_snapshots SET epoch = 1 WHERE board = 'llm' AND day >= '2026-10-29';
