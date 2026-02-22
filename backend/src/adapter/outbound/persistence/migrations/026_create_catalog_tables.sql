-- Migration 026: Create artist_catalog and track_catalog normalization tables
--
-- Instead of repeating artist_name TEXT (~30B avg) and track_name TEXT (~25B avg) on every row
-- of monthly_track_stats (~55K rows/user), we store each unique string once and reference it
-- via a 4-byte INTEGER FK. Estimated savings: ~8-12MB per heavy user.
--
-- This migration is ADDITIVE — no existing columns are changed yet.
-- The app code deploy (reading via JOINs, writing with FK IDs) comes after migration 027.
-- Text column removal is in migration 028 (only after app is verified working).

-- Artist catalog: one row per unique artist name
CREATE TABLE IF NOT EXISTS artist_catalog (
  id          SERIAL  PRIMARY KEY,
  artist_name TEXT    NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_artist_catalog_name ON artist_catalog(artist_name);

-- Track catalog: one row per unique (track_name, artist_name) combination
CREATE TABLE IF NOT EXISTS track_catalog (
  id                SERIAL  PRIMARY KEY,
  track_name        TEXT    NOT NULL,
  artist_name       TEXT    NOT NULL,
  artist_id         INTEGER NOT NULL REFERENCES artist_catalog(id),
  album_name        TEXT,
  spotify_track_uri TEXT,
  UNIQUE (track_name, artist_name)
);

CREATE INDEX IF NOT EXISTS idx_track_catalog_name_artist
  ON track_catalog(track_name, artist_name);

CREATE INDEX IF NOT EXISTS idx_track_catalog_uri
  ON track_catalog(spotify_track_uri)
  WHERE spotify_track_uri IS NOT NULL;

-- Populate artist_catalog from all existing data
INSERT INTO artist_catalog (artist_name)
SELECT DISTINCT artist_name FROM monthly_artist_stats
ON CONFLICT (artist_name) DO NOTHING;

INSERT INTO artist_catalog (artist_name)
SELECT DISTINCT artist_name FROM monthly_track_stats WHERE artist_name IS NOT NULL
ON CONFLICT (artist_name) DO NOTHING;

-- Populate track_catalog — take the most recent row per (track_name, artist_name)
-- so that album_name and spotify_track_uri reflect the newest available metadata.
INSERT INTO track_catalog (track_name, artist_name, artist_id, album_name, spotify_track_uri)
SELECT DISTINCT ON (t.track_name, t.artist_name)
  t.track_name,
  t.artist_name,
  ac.id,
  t.album_name,
  t.spotify_track_uri
FROM monthly_track_stats t
JOIN artist_catalog ac ON ac.artist_name = t.artist_name
ORDER BY t.track_name, t.artist_name, t.month DESC
ON CONFLICT (track_name, artist_name) DO NOTHING;
