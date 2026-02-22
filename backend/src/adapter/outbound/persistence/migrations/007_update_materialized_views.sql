-- Recreate materialized views to only include active sessions (latest per user).

DROP MATERIALIZED VIEW IF EXISTS community_stats;
DROP MATERIALIZED VIEW IF EXISTS global_top_artists;

CREATE MATERIALIZED VIEW community_stats AS
SELECT
  COUNT(DISTINCT s.id) AS total_uploads,
  AVG(ss.total_ms_played / 3600000.0) AS avg_total_hours,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ss.total_ms_played / 3600000.0) AS median_total_hours,
  AVG(ss.unique_artists) AS avg_unique_artists,
  AVG(ss.unique_tracks) AS avg_unique_tracks
FROM upload_sessions s
JOIN session_summaries ss ON s.id = ss.session_id
WHERE s.status = 'completed' AND s.is_active = TRUE;

CREATE UNIQUE INDEX idx_community_stats ON community_stats(total_uploads);

CREATE MATERIALIZED VIEW global_top_artists AS
SELECT
  e.artist_name AS name,
  COUNT(DISTINCT e.session_id) AS upload_count,
  SUM(e.ms_played) AS total_ms,
  COUNT(*) AS total_plays
FROM stream_entries e
JOIN upload_sessions s ON e.session_id = s.id
WHERE e.artist_name IS NOT NULL
  AND s.is_active = TRUE
GROUP BY e.artist_name
ORDER BY upload_count DESC
LIMIT 100;

CREATE UNIQUE INDEX idx_global_top_artists ON global_top_artists(name);
