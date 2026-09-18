CREATE TABLE IF NOT EXISTS link_collections (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE profile_links ADD COLUMN collection_id TEXT REFERENCES link_collections(id) ON DELETE SET NULL;
ALTER TABLE profile_links ADD COLUMN publication_status TEXT NOT NULL DEFAULT 'live'
  CHECK (publication_status IN ('draft', 'live', 'paused', 'scheduled'));

CREATE INDEX IF NOT EXISTS link_collections_profile_position_idx ON link_collections(profile_id, position);
CREATE INDEX IF NOT EXISTS profile_links_collection_position_idx ON profile_links(collection_id, position);
