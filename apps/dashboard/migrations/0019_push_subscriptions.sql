-- Web Push subscriptions, one row per browser that opted in.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- The push service's URL for this browser. Unique because re-subscribing in
  -- the same browser returns the same endpoint, and a duplicate would mean
  -- sending twice.
  endpoint TEXT NOT NULL UNIQUE,
  -- Kept for a future encrypted payload. Bare pushes do not need them, but
  -- re-subscribing every browser later would be worse than storing them now.
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  -- Set when a push service reports the subscription gone, so a dead row is
  -- visible rather than silently deleted.
  failed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS push_subscriptions_workspace_idx
  ON push_subscriptions(workspace_id, failed_at);
