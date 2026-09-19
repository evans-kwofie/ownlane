ALTER TABLE profile_links ADD COLUMN platform_key TEXT;
ALTER TABLE profile_links ADD COLUMN connected_account_id TEXT
  REFERENCES connected_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profile_links_connected_account_idx
  ON profile_links(connected_account_id);
