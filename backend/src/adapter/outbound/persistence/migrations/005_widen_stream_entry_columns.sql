-- Widen columns that can contain long strings in real Spotify export data.
-- platform: Spotify stores full OS/device info e.g. "Android OS 13 API 33 (Build/TP1A.220624.014)"
-- reason_start/end: usually short but TEXT is safest
-- spotify_track_uri: standard URIs fit in 80 but TEXT avoids any edge cases
ALTER TABLE stream_entries
  ALTER COLUMN platform        TYPE TEXT,
  ALTER COLUMN reason_start    TYPE TEXT,
  ALTER COLUMN reason_end      TYPE TEXT,
  ALTER COLUMN spotify_track_uri TYPE TEXT;
