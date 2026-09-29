-- Public names differing only by separators represent the same identity.
-- Keep the chosen slug for display, and enforce the canonical key in the DB so
-- simultaneous account creation cannot claim `evans-kwofie` and
-- `evanskwofie` for different workspaces.
ALTER TABLE workspaces ADD COLUMN slug_key TEXT;

UPDATE workspaces
   SET slug_key = replace(replace(replace(lower(slug), '.', ''), '_', ''), '-', '');

CREATE UNIQUE INDEX workspaces_slug_key_idx ON workspaces(slug_key);
