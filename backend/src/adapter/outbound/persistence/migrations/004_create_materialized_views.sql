CREATE MATERIALIZED VIEW IF NOT EXISTS community_stats AS
SELECT
  COUNT(DISTINCT s.id) AS total_uploads,
  AVG(ss.total_ms_played / 3600000.0) AS avg_total_hours,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ss.total_ms_played / 3600000.0) AS median_total_hours,
  AVG(ss.unique_artists) AS avg_unique_artists,
  AVG(ss.unique_tracks) AS avg_unique_tracks
FROM upload_sessions s
JOIN session_summaries ss ON s.id = ss.session_id
WHERE s.status = 'completed';

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_stats ON community_stats(total_uploads);

CREATE MATERIALIZED VIEW IF NOT EXISTS global_top_artists AS
SELECT
  artist_name AS name,
  COUNT(DISTINCT session_id) AS upload_count,
  SUM(ms_played) AS total_ms,
  COUNT(*) AS total_plays
FROM stream_entries
WHERE artist_name IS NOT NULL
GROUP BY artist_name
ORDER BY upload_count DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_global_top_artists ON global_top_artists(name);
