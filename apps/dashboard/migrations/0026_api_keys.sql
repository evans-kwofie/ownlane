-- Scoped API keys.
--
-- Only a hash is stored: a leaked database row must not yield a working key.
-- The prefix is kept so a key can be identified in a list and in an audit trail
-- without being usable.
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- SHA-256 of the full key. Unique so a lookup is a single indexed read.
  key_hash TEXT NOT NULL UNIQUE,
  -- First characters, e.g. 'olk_live_a1b2'. Shown in the UI.
  key_prefix TEXT NOT NULL,
  -- JSON array. No key is ever unscoped: a website CMS must not reach leads.
  scopes_json TEXT NOT NULL DEFAULT '[]',
  created_by_user_id TEXT NOT NULL,
  expires_at TEXT,
  last_used_at TEXT,
  -- Country reported by Cloudflare on last use. Coarse on purpose; no IP kept.
  last_used_region TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS api_keys_workspace_idx
  ON api_keys(workspace_id, revoked_at);
