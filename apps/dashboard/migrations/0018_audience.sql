-- Module 9: contact capture and the lead inbox.

-- A message sent through the public profile's contact form.
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'replied', 'won', 'archived', 'spam')),
  -- Null until someone on the team opens it.
  read_at TEXT,
  -- Attribution mirrors analytics_events, so a lead knows which campaign
  -- produced it without a second tracking system.
  visitor_hash TEXT,
  referrer_host TEXT,
  country_code TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
  -- The consent wording shown at the time, stored verbatim. A boolean proves
  -- nothing a year later; the sentence someone agreed to does.
  consent_text TEXT NOT NULL,
  consented_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Internal only. Never shown to the person who wrote in.
CREATE TABLE IF NOT EXISTS lead_notes (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_tags (
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lead_id, tag)
);

-- How the form presents itself. A row exists only once the form is configured;
-- its absence means the form has never been turned on.
CREATE TABLE IF NOT EXISTS profile_contact_form (
  profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_enabled INTEGER NOT NULL DEFAULT 0 CHECK (is_enabled IN (0, 1)),
  heading TEXT,
  intro TEXT,
  consent_text TEXT,
  ask_subject INTEGER NOT NULL DEFAULT 1 CHECK (ask_subject IN (0, 1)),
  ask_phone INTEGER NOT NULL DEFAULT 0 CHECK (ask_phone IN (0, 1)),
  notify_owner INTEGER NOT NULL DEFAULT 1 CHECK (notify_owner IN (0, 1)),
  notify_email TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS leads_profile_created_idx
  ON leads(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_profile_status_created_idx
  ON leads(profile_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_notes_lead_idx
  ON lead_notes(lead_id, created_at DESC);
