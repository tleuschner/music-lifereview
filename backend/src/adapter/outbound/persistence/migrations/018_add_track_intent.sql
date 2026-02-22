-- Adds deliberate/served intent counts to monthly_track_stats for track-level intent analysis.
ALTER TABLE monthly_track_stats
  ADD COLUMN IF NOT EXISTS deliberate_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS served_count     INTEGER NOT NULL DEFAULT 0;
