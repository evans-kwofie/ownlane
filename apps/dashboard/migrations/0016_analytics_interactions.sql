CREATE TABLE analytics_events_next (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('profile_view', 'outbound_click', 'profile_interaction')),
  interaction_type TEXT,
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

INSERT INTO analytics_events_next (
  id, profile_id, event_type, destination_type, destination_id, occurred_at,
  visitor_hash, referrer_host, utm_source, utm_medium, utm_campaign, device_type
)
SELECT
  id, profile_id, event_type, destination_type, destination_id, occurred_at,
  visitor_hash, referrer_host, utm_source, utm_medium, utm_campaign, device_type
FROM analytics_events;

DROP TABLE analytics_events;
ALTER TABLE analytics_events_next RENAME TO analytics_events;

CREATE INDEX analytics_events_profile_time_idx
  ON analytics_events(profile_id, occurred_at DESC);

CREATE INDEX analytics_events_destination_time_idx
  ON analytics_events(profile_id, destination_type, destination_id, occurred_at DESC);
