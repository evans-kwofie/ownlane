ALTER TABLE analytics_events ADD COLUMN country_code TEXT;

CREATE INDEX IF NOT EXISTS analytics_events_profile_country_idx
  ON analytics_events(profile_id, country_code, occurred_at DESC);
