-- Migration 027: Add FK columns to stats tables and populate them
--
-- This migration is ADDITIVE — it adds track_id/artist_id columns alongside the existing
-- text columns. The old text columns remain until migration 028 (after app deploy).
--
-- After this migration, deploy the updated app code that:
--   - Writes both FK IDs and text columns during ingestion
--   - Reads via JOIN to catalog tables instead of using inline text columns
--
-- Run migration 028 only after the new app code is verified working.

-- Add FK columns to monthly_track_stats
ALTER TABLE monthly_track_stats
  ADD COLUMN IF NOT EXISTS track_id  INTEGER REFERENCES track_catalog(id),
  ADD COLUMN IF NOT EXISTS artist_id INTEGER REFERENCES artist_catalog(id);

-- Add FK column to monthly_artist_stats
ALTER TABLE monthly_artist_stats
  ADD COLUMN IF NOT EXISTS artist_id INTEGER REFERENCES artist_catalog(id);

-- Add FK column to track_first_play
ALTER TABLE track_first_play
  ADD COLUMN IF NOT EXISTS track_id INTEGER REFERENCES track_catalog(id);

-- Populate track_id and artist_id for all existing monthly_track_stats rows
UPDATE monthly_track_stats mts
SET track_id  = tc.id,
    artist_id = ac.id
FROM track_catalog  tc
JOIN artist_catalog ac ON ac.artist_name = tc.artist_name
WHERE tc.track_name  = mts.track_name
  AND tc.artist_name = mts.artist_name;

-- Populate artist_id for all existing monthly_artist_stats rows
UPDATE monthly_artist_stats mas
SET artist_id = ac.id
FROM artist_catalog ac
WHERE ac.artist_name = mas.artist_name;

-- Populate track_id for track_first_play via spotify_track_uri
-- (use DISTINCT ON in case the catalog has multiple matches per URI)
UPDATE track_first_play tfp
SET track_id = tc.id
FROM (
  SELECT DISTINCT ON (spotify_track_uri) id, spotify_track_uri
  FROM track_catalog
  WHERE spotify_track_uri IS NOT NULL
  ORDER BY spotify_track_uri, id
) tc
WHERE tfp.spotify_track_uri = tc.spotify_track_uri;

-- Indexes on FK columns — query performance for the JOIN-based reads
CREATE INDEX IF NOT EXISTS idx_mts_session_trackid
  ON monthly_track_stats(session_id, track_id);

CREATE INDEX IF NOT EXISTS idx_mas_session_artistid
  ON monthly_artist_stats(session_id, artist_id);
