-- Outbound webhooks. Schema as decided in docs/developer-platform.md.

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  -- Encrypted with the same key as provider tokens. Never stored in plaintext
  -- and never returned after creation.
  secret_ciphertext TEXT NOT NULL,
  -- Last four characters, so an endpoint can be told apart without the secret.
  secret_hint TEXT NOT NULL,
  events_json TEXT NOT NULL DEFAULT '["lead.created"]',
  -- 'minimal' sends identifiers only: a notification without the personal data.
  payload_mode TEXT NOT NULL DEFAULT 'full'
    CHECK (payload_mode IN ('full', 'minimal')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  disabled_reason TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  -- Stable across retries, so a receiver can dedupe on it.
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  -- The exact bytes signed and sent. Re-serialising a parsed object would
  -- produce a different body and a signature that no longer verifies.
  payload_json TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'exhausted')),
  response_status INTEGER,
  duration_ms INTEGER,
  error TEXT,
  next_attempt_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS webhook_endpoints_workspace_idx
  ON webhook_endpoints(workspace_id, is_active);
CREATE INDEX IF NOT EXISTS webhook_deliveries_endpoint_idx
  ON webhook_deliveries(endpoint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_deliveries_retry_idx
  ON webhook_deliveries(status, next_attempt_at);
