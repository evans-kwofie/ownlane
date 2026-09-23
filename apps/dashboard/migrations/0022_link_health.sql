-- Whether each link's destination still works.
--
-- One row per link rather than a log: what matters is the current verdict and
-- how long it has been failing. A full history of every probe would grow without
-- bound and answer a question nobody asks.
CREATE TABLE IF NOT EXISTS link_health (
  link_id TEXT PRIMARY KEY REFERENCES profile_links(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'unchecked'
    CHECK (state IN ('unchecked', 'ok', 'redirected', 'broken', 'unreachable', 'skipped')),
  status_code INTEGER,
  -- Where a permanent redirect now points, so the link can be corrected.
  redirect_url TEXT,
  -- A site blips. Only a run of failures means the link is actually broken.
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT,
  last_ok_at TEXT,
  error TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Drives "which links are most overdue a check".
CREATE INDEX IF NOT EXISTS link_health_staleness_idx
  ON link_health(last_checked_at);
