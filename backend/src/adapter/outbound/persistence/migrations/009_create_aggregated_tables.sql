-- Replace raw stream_entries with monthly aggregated tables for scalability.
-- Storage reduction: ~90-95% fewer rows while preserving month-granularity filtering.

-- Per-artist monthly stats (top artists, artist over time, community stats)
CREATE TABLE IF NOT EXISTS monthly_artist_stats (
  session_id    UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  month         DATE NOT NULL,
  artist_name   TEXT NOT NULL,
  play_count    INTEGER NOT NULL,
  ms_played     BIGINT NOT NULL,
  skip_count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, month, artist_name)
);

CREATE INDEX IF NOT EXISTS idx_monthly_artist_session ON monthly_artist_stats(session_id);
CREATE INDEX IF NOT EXISTS idx_monthly_artist_session_month ON monthly_artist_stats(session_id, month);

-- Per-track monthly stats (top tracks, skipped tracks, discovery rate)
CREATE TABLE IF NOT EXISTS monthly_track_stats (
  session_id        UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  month             DATE NOT NULL,
  track_name        TEXT NOT NULL,
  artist_name       TEXT NOT NULL,
  album_name        TEXT,
  spotify_track_uri TEXT,
  play_count        INTEGER NOT NULL,
  ms_played         BIGINT NOT NULL,
  skip_count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, month, track_name, artist_name)
);

CREATE INDEX IF NOT EXISTS idx_monthly_track_session ON monthly_track_stats(session_id);
CREATE INDEX IF NOT EXISTS idx_monthly_track_session_month ON monthly_track_stats(session_id, month);

-- Monthly heatmap (day-of-week x hour-of-day, per month for date filtering)
CREATE TABLE IF NOT EXISTS monthly_heatmap (
  session_id    UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  month         DATE NOT NULL,
  day_of_week   SMALLINT NOT NULL,
  hour_of_day   SMALLINT NOT NULL,
  ms_played     BIGINT NOT NULL,
  PRIMARY KEY (session_id, month, day_of_week, hour_of_day)
);

CREATE INDEX IF NOT EXISTS idx_monthly_heatmap_session ON monthly_heatmap(session_id);

-- First play month per track (for discovery rate computation)
CREATE TABLE IF NOT EXISTS track_first_play (
  session_id        UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  spotify_track_uri TEXT NOT NULL,
  first_play_month  DATE NOT NULL,
  PRIMARY KEY (session_id, spotify_track_uri)
);

CREATE INDEX IF NOT EXISTS idx_track_first_play_session ON track_first_play(session_id);

-- Monthly totals (for timeline chart)
CREATE TABLE IF NOT EXISTS monthly_listen_totals (
  session_id    UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  month         DATE NOT NULL,
  play_count    INTEGER NOT NULL,
  ms_played     BIGINT NOT NULL,
  PRIMARY KEY (session_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_totals_session ON monthly_listen_totals(session_id);

-- Recreate global_top_artists to read from monthly_artist_stats instead of stream_entries
DROP MATERIALIZED VIEW IF EXISTS global_top_artists;

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_global_top_artists ON global_top_artists(name);
