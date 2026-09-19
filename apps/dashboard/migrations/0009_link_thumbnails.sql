ALTER TABLE profile_links ADD COLUMN thumbnail_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profile_links_thumbnail_asset_idx
  ON profile_links(thumbnail_asset_id);
