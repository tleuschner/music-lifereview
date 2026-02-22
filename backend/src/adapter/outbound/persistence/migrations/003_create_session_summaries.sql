CREATE TABLE IF NOT EXISTS session_summaries (
  session_id        UUID PRIMARY KEY REFERENCES upload_sessions(id) ON DELETE CASCADE,
  total_ms_played   BIGINT NOT NULL,
  total_entries     INTEGER NOT NULL,
  unique_tracks     INTEGER NOT NULL,
  unique_artists    INTEGER NOT NULL,
  unique_albums     INTEGER NOT NULL,
  date_from         TIMESTAMPTZ NOT NULL,
  date_to           TIMESTAMPTZ NOT NULL,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
