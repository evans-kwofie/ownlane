-- Retain an auditable, non-PII record when a lead is erased at its request.
CREATE TABLE IF NOT EXISTS lead_erasure_log (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deleted_by_user_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- At most one lead-push burst per workspace every five minutes.
CREATE TABLE IF NOT EXISTS lead_push_cooldowns (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
