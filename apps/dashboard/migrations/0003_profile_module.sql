-- The canonical profile, built out: what a platform asks for, who vouches for
-- it, how it may be contacted, where each field's truth comes from, and what it
-- looked like before the last change.

-- Columns that hold a single value stay on the profile itself.
ALTER TABLE profiles ADD COLUMN creator_type TEXT NOT NULL DEFAULT 'person'
  CHECK (creator_type IN ('person', 'creator', 'freelancer', 'founder', 'artist', 'agency', 'business', 'project'));
ALTER TABLE profiles ADD COLUMN template TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE profiles ADD COLUMN preferred_contact TEXT NOT NULL DEFAULT 'email'
  CHECK (preferred_contact IN ('email', 'phone', 'whatsapp', 'booking', 'none'));
ALTER TABLE profiles ADD COLUMN city TEXT;
ALTER TABLE profiles ADD COLUMN country TEXT;
ALTER TABLE profiles ADD COLUMN service_area TEXT;
ALTER TABLE profiles ADD COLUMN remote_availability TEXT NOT NULL DEFAULT 'unspecified'
  CHECK (remote_availability IN ('unspecified', 'remote', 'hybrid', 'onsite'));
ALTER TABLE profiles ADD COLUMN availability_status TEXT NOT NULL DEFAULT 'unspecified'
  CHECK (availability_status IN ('unspecified', 'available', 'selective', 'booked', 'not_available'));
ALTER TABLE profiles ADD COLUMN logo_key TEXT;

-- Which contact details may be published, independently of whether they exist.
CREATE TABLE IF NOT EXISTS profile_contact_visibility (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('publicEmail', 'phone', 'whatsapp', 'bookingUrl')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  PRIMARY KEY (profile_id, channel)
);

-- Uploaded media, tracked as rows rather than bare R2 keys, so the asset
-- library can see every image the profile uses.
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'image' CHECK (kind IN ('image', 'logo', 'cover', 'document')),
  content_type TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  original_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Proof: verifications, credentials, affiliations and press, which differ in
-- meaning but behave identically — a label, a link, and an order.
CREATE TABLE IF NOT EXISTS profile_credibility (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('verification', 'credential', 'affiliation', 'press')),
  label TEXT NOT NULL,
  url TEXT,
  issuer TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- What this identity offers, and in what order it should be shown.
CREATE TABLE IF NOT EXISTS profile_services (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Where a field's truth comes from. Absent means Ownlane owns it; a provider
-- here means Ownlane follows that platform instead of writing to it.
CREATE TABLE IF NOT EXISTS profile_field_sources (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ownlane',
  PRIMARY KEY (profile_id, field)
);

-- Every saved state, so a change can be compared and undone.
CREATE TABLE IF NOT EXISTS profile_versions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_json TEXT NOT NULL,
  changed_fields_json TEXT NOT NULL DEFAULT '[]',
  created_by TEXT,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Changes queued for a date: a rename on launch day, a status change when a
-- season starts.
CREATE TABLE IF NOT EXISTS profile_scheduled_changes (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  changes_json TEXT NOT NULL,
  apply_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'cancelled', 'failed')),
  applied_at TEXT,
  error_message TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS assets_workspace_idx ON assets(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS profile_credibility_profile_idx ON profile_credibility(profile_id, kind, position);
CREATE INDEX IF NOT EXISTS profile_services_profile_idx ON profile_services(profile_id, position);
CREATE INDEX IF NOT EXISTS profile_versions_profile_idx ON profile_versions(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS profile_scheduled_due_idx ON profile_scheduled_changes(status, apply_at);
