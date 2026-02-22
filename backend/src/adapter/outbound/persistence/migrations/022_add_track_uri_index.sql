-- Add index on spotify_track_uri for the discovery rate JOIN.
-- The discovery query joins monthly_track_stats with track_first_play on
-- (session_id, spotify_track_uri), but there was no index on that column,
-- causing a full session-scoped scan for every discovery request.
CREATE INDEX IF NOT EXISTS idx_monthly_track_session_uri
  ON monthly_track_stats(session_id, spotify_track_uri)
  WHERE spotify_track_uri IS NOT NULL;
