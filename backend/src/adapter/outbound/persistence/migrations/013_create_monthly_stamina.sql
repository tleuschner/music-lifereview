CREATE TABLE IF NOT EXISTS monthly_stamina (
  session_id       UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  month            DATE NOT NULL,
  day_of_week      SMALLINT NOT NULL,
  hour_of_day      SMALLINT NOT NULL,
  total_chain_length INTEGER NOT NULL DEFAULT 0,
  chain_count      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, month, day_of_week, hour_of_day)
);
