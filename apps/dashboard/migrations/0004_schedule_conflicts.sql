-- Whoever schedules a change decides what happens if the field is edited by
-- hand before it fires: let it overwrite, or leave the newer edit alone.
ALTER TABLE profile_scheduled_changes ADD COLUMN conflict_strategy TEXT NOT NULL DEFAULT 'overwrite'
  CHECK (conflict_strategy IN ('overwrite', 'skip_edited'));

-- The state at scheduling time, so "edited since" can be answered when it runs.
ALTER TABLE profile_scheduled_changes ADD COLUMN baseline_json TEXT NOT NULL DEFAULT '{}';
