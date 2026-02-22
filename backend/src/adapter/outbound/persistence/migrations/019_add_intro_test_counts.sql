ALTER TABLE monthly_track_stats
  ADD COLUMN IF NOT EXISTS short_play_count  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trackdone_count   integer NOT NULL DEFAULT 0;
