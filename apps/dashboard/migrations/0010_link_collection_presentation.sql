ALTER TABLE link_collections ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE link_collections ADD COLUMN layout TEXT NOT NULL DEFAULT 'list'
  CHECK (layout IN ('list', 'grid', 'compact'));
