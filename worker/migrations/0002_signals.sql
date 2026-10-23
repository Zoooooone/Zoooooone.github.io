-- Signals collected from the browser. Visits recorded before this migration keep NULL (or an empty string),
-- which means "not measured", not "no".
ALTER TABLE visits ADD COLUMN viewport TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN dpr TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN touch INTEGER;
ALTER TABLE visits ADD COLUMN nav TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN utm_source TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN utm_medium TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN utm_campaign TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN automation INTEGER;
ALTER TABLE visits ADD COLUMN interacted INTEGER;
ALTER TABLE visits ADD COLUMN scroll_pct INTEGER;
ALTER TABLE visits ADD COLUMN ua TEXT NOT NULL DEFAULT '';
