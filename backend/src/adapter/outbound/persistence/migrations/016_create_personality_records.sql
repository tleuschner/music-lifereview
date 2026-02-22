-- One personality record per session; upserts are idempotent so the
-- frontend can safely re-record on every dashboard load.
-- Indexed on personality_id only — that's the sole aggregation axis.
CREATE TABLE personality_records (
  session_id   UUID        NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  personality_id VARCHAR(50) NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id)
);

CREATE INDEX idx_personality_records_personality_id
  ON personality_records(personality_id);
