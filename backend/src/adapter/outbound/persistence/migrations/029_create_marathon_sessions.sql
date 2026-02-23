CREATE TABLE IF NOT EXISTS marathon_sessions (
  id               SERIAL PRIMARY KEY,
  session_id       VARCHAR NOT NULL,
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ NOT NULL,
  duration_ms      BIGINT NOT NULL,
  play_count       INTEGER NOT NULL,
  skip_count       INTEGER NOT NULL,
  skip_rate        FLOAT NOT NULL,
  top_artist       TEXT,
  top_track        TEXT,
  top_track_artist TEXT,
  rank             INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS marathon_sessions_session_id_idx
  ON marathon_sessions (session_id);
