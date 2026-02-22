-- Add back_count to monthly_track_stats to track how often a track was
-- replayed by pressing the back button (reason_start = 'backbtn').
-- Existing rows default to 0 — this column is only populated for new uploads.
ALTER TABLE monthly_track_stats
  ADD COLUMN IF NOT EXISTS back_count INTEGER NOT NULL DEFAULT 0;
