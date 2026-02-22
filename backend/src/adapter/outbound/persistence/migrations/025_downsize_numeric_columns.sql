-- Migration 025: Downsize numeric columns
--
-- PRE-CONDITION: Run the T7 overflow check from the test plan before executing this migration.
-- ALL per-track counters must be <= 32767 (SMALLINT max) to avoid data truncation.
--
--   SELECT MAX(play_count), MAX(skip_count), MAX(back_count),
--          MAX(shuffle_play_count), MAX(short_play_count), MAX(trackdone_count),
--          MAX(fwd_skip_count), MAX(deliberate_count), MAX(served_count),
--          MAX(shuffle_trackdone_count)
--   FROM monthly_track_stats;
--
-- ms_played per track per month: max realistic ~150M ms → safely within INT4 max (2.1B).
-- ms_played per artist per month: max realistic ~900M ms → safely within INT4 max.
-- monthly_listen_totals.ms_played stays BIGINT (full-month total can approach 2.7B ms).

-- Temporarily drop materialized view that depends on monthly_artist_stats.ms_played
DROP MATERIALIZED VIEW IF EXISTS global_top_artists;

-- Track stats: counters → SMALLINT, ms_played → INTEGER
ALTER TABLE monthly_track_stats
  ALTER COLUMN play_count              TYPE SMALLINT USING play_count::SMALLINT,
  ALTER COLUMN skip_count              TYPE SMALLINT USING skip_count::SMALLINT,
  ALTER COLUMN back_count              TYPE SMALLINT USING back_count::SMALLINT,
  ALTER COLUMN shuffle_play_count      TYPE SMALLINT USING shuffle_play_count::SMALLINT,
  ALTER COLUMN shuffle_trackdone_count TYPE SMALLINT USING shuffle_trackdone_count::SMALLINT,
  ALTER COLUMN deliberate_count        TYPE SMALLINT USING deliberate_count::SMALLINT,
  ALTER COLUMN served_count            TYPE SMALLINT USING served_count::SMALLINT,
  ALTER COLUMN short_play_count        TYPE SMALLINT USING short_play_count::SMALLINT,
  ALTER COLUMN trackdone_count         TYPE SMALLINT USING trackdone_count::SMALLINT,
  ALTER COLUMN fwd_skip_count          TYPE SMALLINT USING fwd_skip_count::SMALLINT,
  ALTER COLUMN ms_played               TYPE INTEGER  USING ms_played::INTEGER;

-- Artist stats: ms_played → INTEGER (play_count stays INTEGER — artist monthly totals can exceed 32K)
ALTER TABLE monthly_artist_stats
  ALTER COLUMN ms_played TYPE INTEGER USING ms_played::INTEGER;

-- Hourly stats: ms_played → INTEGER (run only after 024b has dropped old tables)
ALTER TABLE monthly_hourly_stats
  ALTER COLUMN ms_played TYPE INTEGER USING ms_played::INTEGER;

-- Recreate the materialized view
CREATE MATERIALIZED VIEW global_top_artists AS
SELECT
  a.artist_name AS name,
  COUNT(DISTINCT a.session_id) AS upload_count,
  SUM(a.ms_played) AS total_ms,
  SUM(a.play_count) AS total_plays
FROM monthly_artist_stats a
JOIN upload_sessions s ON a.session_id = s.id
WHERE s.is_active = TRUE
GROUP BY a.artist_name
ORDER BY upload_count DESC
LIMIT 100;

CREATE UNIQUE INDEX idx_global_top_artists ON global_top_artists(name);
