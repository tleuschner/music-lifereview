-- Migration 028: Drop text columns and rebuild PKs using integer catalog IDs
--
-- Run ONLY after:
--   1. Migrations 026 and 027 have been applied
--   2. The updated app code (using catalog JOINs) has been deployed and verified
--   3. Integrity checks from the test plan have passed:
--        - Discovery rate fingerprint (T5) matches pre-migration baseline
--        - Top-10 tracks via JOIN produce the same results as pre-migration
--        - All dashboard stat endpoints return data (no 500s)
--
-- This migration is DESTRUCTIVE — the text columns cannot be recovered after this point
-- without replaying ingestion from the original JSON exports.

-- ── Drop dependent materialized view first ───────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS global_top_artists;

-- ── monthly_track_stats ──────────────────────────────────────────────────────
-- Rebuild PK: (session_id, month, track_name, artist_name) → (session_id, month, track_id)
ALTER TABLE monthly_track_stats DROP CONSTRAINT monthly_track_stats_pkey;
ALTER TABLE monthly_track_stats
  ALTER COLUMN track_id  SET NOT NULL,
  ALTER COLUMN artist_id SET NOT NULL;
ALTER TABLE monthly_track_stats ADD PRIMARY KEY (session_id, month, track_id);
ALTER TABLE monthly_track_stats
  DROP COLUMN track_name,
  DROP COLUMN artist_name,
  DROP COLUMN album_name,
  DROP COLUMN spotify_track_uri;
-- idx_mts_session_trackid (added in 027) covers (session_id, track_id) for lookups;
-- the old uri index on this table is no longer needed (uri is now on track_catalog)
DROP INDEX IF EXISTS idx_monthly_track_session_uri;

-- ── monthly_artist_stats ─────────────────────────────────────────────────────
-- Rebuild PK: (session_id, month, artist_name) → (session_id, month, artist_id)
ALTER TABLE monthly_artist_stats DROP CONSTRAINT monthly_artist_stats_pkey;
ALTER TABLE monthly_artist_stats ALTER COLUMN artist_id SET NOT NULL;
ALTER TABLE monthly_artist_stats ADD PRIMARY KEY (session_id, month, artist_id);
ALTER TABLE monthly_artist_stats DROP COLUMN artist_name;

-- ── track_first_play ─────────────────────────────────────────────────────────
-- Remove orphan rows whose URI didn't match any track_catalog entry during 027 backfill
DELETE FROM track_first_play WHERE track_id IS NULL;
-- Rebuild PK: (session_id, spotify_track_uri) → (session_id, track_id)
ALTER TABLE track_first_play DROP CONSTRAINT track_first_play_pkey;
ALTER TABLE track_first_play ALTER COLUMN track_id SET NOT NULL;
ALTER TABLE track_first_play ADD PRIMARY KEY (session_id, track_id);
ALTER TABLE track_first_play DROP COLUMN spotify_track_uri;
-- PK (session_id, track_id) covers all session-scoped lookups; old session-only index is redundant
DROP INDEX IF EXISTS idx_track_first_play_session;

-- ── Recreate global_top_artists using catalog JOINs ──────────────────────────
CREATE MATERIALIZED VIEW global_top_artists AS
SELECT
  ac.artist_name                AS name,
  COUNT(DISTINCT a.session_id)  AS upload_count,
  SUM(a.ms_played)              AS total_ms,
  SUM(a.play_count)             AS total_plays
FROM monthly_artist_stats a
JOIN upload_sessions  s  ON a.session_id = s.id
JOIN artist_catalog   ac ON a.artist_id  = ac.id
WHERE s.is_active = TRUE
GROUP BY ac.artist_name
ORDER BY upload_count DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_global_top_artists ON global_top_artists(name);
