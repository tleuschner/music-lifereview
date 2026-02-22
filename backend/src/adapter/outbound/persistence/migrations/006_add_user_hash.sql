-- Add user_hash (SHA-256 of Spotify username) to link uploads from the same user.
-- Only the most recent upload per user counts toward community stats (is_active).
ALTER TABLE upload_sessions
  ADD COLUMN IF NOT EXISTS user_hash  VARCHAR(64),
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_sessions_user_hash ON upload_sessions(user_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON upload_sessions(user_hash, is_active) WHERE is_active = TRUE;
