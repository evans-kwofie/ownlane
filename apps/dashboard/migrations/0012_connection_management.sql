ALTER TABLE connected_accounts ADD COLUMN display_name TEXT;
ALTER TABLE connected_accounts ADD COLUMN account_type TEXT;
ALTER TABLE connected_accounts ADD COLUMN scopes_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE connected_accounts ADD COLUMN token_health TEXT NOT NULL DEFAULT 'unknown'
  CHECK (token_health IN ('unknown', 'healthy', 'expiring', 'expired', 'missing'));
ALTER TABLE connected_accounts ADD COLUMN token_expires_at TEXT;
ALTER TABLE connected_accounts ADD COLUMN sync_mode TEXT NOT NULL DEFAULT 'manual'
  CHECK (sync_mode IN ('off', 'manual', 'automatic', 'scheduled'));
ALTER TABLE connected_accounts ADD COLUMN sync_preferences_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE connected_accounts ADD COLUMN connection_owner_user_id TEXT;
ALTER TABLE connected_accounts ADD COLUMN last_error_code TEXT;
ALTER TABLE connected_accounts ADD COLUMN last_error_message TEXT;

-- Provider credentials never live in the browser or in the account directory row.
-- OAuth adapters write only authenticated ciphertext into this table.
CREATE TABLE IF NOT EXISTS connected_account_credentials (
  connected_account_id TEXT PRIMARY KEY REFERENCES connected_accounts(id) ON DELETE CASCADE,
  access_token_ciphertext TEXT NOT NULL,
  refresh_token_ciphertext TEXT,
  encryption_key_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS connected_accounts_attention_idx
  ON connected_accounts(profile_id, connection_status, token_health);
