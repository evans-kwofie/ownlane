-- Slugs a workspace used to answer to.
--
-- The navigation map promises that a renamed workspace keeps working: "slugs are
-- unique per account and redirect after a rename so links survive". Without
-- this, renaming silently breaks every bookmark, shared dashboard link and
-- anything a person put in an email.
--
-- An old slug is also reserved by its presence here, so a rename cannot hand
-- somebody else's former address to a new workspace and quietly redirect their
-- old links into it.
CREATE TABLE IF NOT EXISTS workspace_slug_history (
  slug TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  released_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS workspace_slug_history_workspace_idx
  ON workspace_slug_history(workspace_id);
