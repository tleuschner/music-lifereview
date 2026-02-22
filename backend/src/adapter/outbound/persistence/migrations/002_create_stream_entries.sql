CREATE TABLE IF NOT EXISTS stream_entries (
  id                BIGSERIAL PRIMARY KEY,
  session_id        UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  ts                TIMESTAMPTZ NOT NULL,
  track_name        TEXT,
  artist_name       TEXT,
  album_name        TEXT,
  ms_played         INTEGER NOT NULL,
  spotify_track_uri TEXT,
  reason_start      TEXT,
  reason_end        TEXT,
  shuffle           BOOLEAN NOT NULL DEFAULT FALSE,
  skipped           BOOLEAN NOT NULL DEFAULT FALSE,
  platform          TEXT,
  conn_country      VARCHAR(5)
);

CREATE INDEX IF NOT EXISTS idx_entries_session ON stream_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_entries_session_ts ON stream_entries(session_id, ts);
CREATE INDEX IF NOT EXISTS idx_entries_artist ON stream_entries(session_id, artist_name);
CREATE INDEX IF NOT EXISTS idx_entries_track ON stream_entries(session_id, track_name);
CREATE INDEX IF NOT EXISTS idx_entries_skipped ON stream_entries(session_id, skipped) WHERE skipped = TRUE;
