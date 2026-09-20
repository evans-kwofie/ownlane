CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('profile_view', 'outbound_click')),
  destination_type TEXT CHECK (destination_type IN ('link', 'content')),
  destination_id TEXT,
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visitor_hash TEXT NOT NULL,
  referrer_host TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT NOT NULL CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown'))
);

CREATE INDEX IF NOT EXISTS analytics_events_profile_time_idx
  ON analytics_events(profile_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_destination_time_idx
  ON analytics_events(profile_id, destination_type, destination_id, occurred_at DESC);
