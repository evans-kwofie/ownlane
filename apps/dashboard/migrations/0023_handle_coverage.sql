-- Whether your handle is yours, free, or somebody else's on each platform.
--
-- This is deliberately not impersonation detection. No provider offers an API
-- for "find accounts that resemble me", and guessing at resemblance would mean
-- accusing real people on a fuzzy match. What can be established honestly is
-- whether a handle resolves, which is a fact rather than an allegation.
CREATE TABLE IF NOT EXISTS handle_coverage (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  -- The handle that was checked, so a verdict is never read against a
  -- handle the person has since changed.
  handle TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'unknown'
    CHECK (state IN ('unknown', 'yours', 'available', 'taken', 'unverifiable')),
  status_code INTEGER,
  checked_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (profile_id, provider)
);

CREATE INDEX IF NOT EXISTS handle_coverage_staleness_idx
  ON handle_coverage(checked_at);
