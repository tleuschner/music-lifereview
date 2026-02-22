-- Migration 023: Drop redundant indexes
--
-- idx_monthly_track_session_month (session_id, month) is fully covered by the composite PK
-- (session_id, month, track_name, artist_name) — the planner uses the PK prefix for all
-- WHERE session_id = ? AND month >= ? queries.
--
-- idx_monthly_artist_session_month (session_id, month) is fully covered by the composite PK
-- (session_id, month, artist_name) for the same reason.
--
-- Dropping these saves index storage and speeds up INSERT during ingestion.

DROP INDEX IF EXISTS idx_monthly_track_session_month;
DROP INDEX IF EXISTS idx_monthly_artist_session_month;
