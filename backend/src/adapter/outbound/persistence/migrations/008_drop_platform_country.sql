-- Remove platform and country data — not used for any stats.
ALTER TABLE stream_entries
  DROP COLUMN IF EXISTS platform,
  DROP COLUMN IF EXISTS conn_country;
