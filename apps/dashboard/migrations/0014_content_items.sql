CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connected_account_id TEXT NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_item_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  image_url TEXT,
  published_at TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (connected_account_id, provider_item_id)
);
CREATE INDEX IF NOT EXISTS content_items_profile_published_idx ON content_items(profile_id, published_at DESC, imported_at DESC);
