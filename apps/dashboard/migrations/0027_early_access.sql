-- Beta sign-ups, with the handle each person wants.
--
-- `handle` is UNIQUE, so a reservation is real: the first person to ask for a
-- name holds it. That matters because the page says "reserved", and a promise
-- the database does not enforce is a promise broken later, in public, to the
-- person who cared enough to sign up first.
CREATE TABLE IF NOT EXISTS early_access (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  -- Stored lowercase. Null when somebody joined without naming a handle.
  handle TEXT UNIQUE,
  -- Attribution, matching analytics_events so a sign-up knows its campaign.
  referrer_host TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  country_code TEXT,
  invited_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS early_access_email_idx ON early_access(email);
CREATE INDEX IF NOT EXISTS early_access_created_idx ON early_access(created_at DESC);
