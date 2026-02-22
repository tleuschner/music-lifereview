-- Migration 024: Merge monthly_heatmap + monthly_stamina → monthly_hourly_stats
--
-- Both tables share the exact same PK (session_id, month, day_of_week, hour_of_day)
-- and are always written together during ingestion. Merging them eliminates a full
-- table + index's worth of overhead per user.
--
-- Old tables are NOT dropped here — they remain as a safety net until the application
-- code has been updated and deployed. Run 024b_drop_old_hourly_tables.sql after that.

CREATE TABLE IF NOT EXISTS monthly_hourly_stats (
  session_id         UUID     NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  month              DATE     NOT NULL,
  day_of_week        SMALLINT NOT NULL,
  hour_of_day        SMALLINT NOT NULL,
  ms_played          BIGINT   NOT NULL DEFAULT 0,
  total_chain_length INTEGER  NOT NULL DEFAULT 0,
  chain_count        INTEGER  NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, month, day_of_week, hour_of_day)
);

CREATE INDEX IF NOT EXISTS idx_monthly_hourly_session
  ON monthly_hourly_stats(session_id);

-- Migrate existing data with a FULL OUTER JOIN so rows that exist in only one
-- of the two source tables are still included (handles edge cases where a slot
-- has heatmap data but no stamina data or vice versa).
INSERT INTO monthly_hourly_stats
  (session_id, month, day_of_week, hour_of_day, ms_played, total_chain_length, chain_count)
SELECT
  COALESCE(h.session_id, s.session_id),
  COALESCE(h.month,      s.month),
  COALESCE(h.day_of_week, s.day_of_week),
  COALESCE(h.hour_of_day, s.hour_of_day),
  COALESCE(h.ms_played, 0),
  COALESCE(s.total_chain_length, 0),
  COALESCE(s.chain_count, 0)
FROM monthly_heatmap h
FULL OUTER JOIN monthly_stamina s
  ON  h.session_id  = s.session_id
  AND h.month       = s.month
  AND h.day_of_week = s.day_of_week
  AND h.hour_of_day = s.hour_of_day
ON CONFLICT DO NOTHING;
