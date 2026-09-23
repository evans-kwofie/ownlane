-- `display_name` and `provider_handle` were only ever written during the OAuth
-- connect flow, so they are a snapshot from whenever the account was linked.
-- Comparing a stale snapshot against the canonical profile reports drift that
-- may not exist — and after a push sync it reports drift Ownlane itself just
-- removed. This column records when the values were last read back from the
-- provider, so a consistency check can refuse to judge unverified data.
ALTER TABLE connected_accounts ADD COLUMN identity_checked_at TEXT;
