ALTER TABLE aa_snapshots ADD COLUMN top REAL;
UPDATE aa_snapshots
SET top = (SELECT MAX(intelligence) FROM aa_llm WHERE aa_llm.day = aa_snapshots.day)
WHERE board = 'llm';
