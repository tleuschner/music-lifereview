CREATE TABLE IF NOT EXISTS upload_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token   VARCHAR(24) UNIQUE NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  entry_count   INTEGER,
  total_ms      BIGINT,
  date_from     TIMESTAMPTZ,
  date_to       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON upload_sessions(share_token);
