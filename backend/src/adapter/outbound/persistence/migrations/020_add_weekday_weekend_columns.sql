-- Add weekday/weekend play and skip counts to monthly artist stats.
-- Weekday = Mon–Fri (UTC day_of_week 1–5), Weekend = Sat–Sun (0, 6).
ALTER TABLE monthly_artist_stats
  ADD COLUMN IF NOT EXISTS weekday_play_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekend_play_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekday_skip_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekend_skip_count INT NOT NULL DEFAULT 0;
