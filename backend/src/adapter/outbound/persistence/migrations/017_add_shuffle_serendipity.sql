-- Tracks shuffle plays and shuffle completions per track for Shuffle Serendipity feature.
ALTER TABLE monthly_track_stats ADD COLUMN IF NOT EXISTS shuffle_play_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE monthly_track_stats ADD COLUMN IF NOT EXISTS shuffle_trackdone_count INTEGER NOT NULL DEFAULT 0;
