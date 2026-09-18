-- An asset needs a name a person chose, separate from the filename it arrived
-- with; a note about how to use it; alt text, which is published; and a kind,
-- which decides how providers will treat it.
ALTER TABLE assets ADD COLUMN title TEXT;
ALTER TABLE assets ADD COLUMN description TEXT;
ALTER TABLE assets ADD COLUMN alt_text TEXT;

-- Existing rows keep their filename as a starting title.
UPDATE assets SET title = original_name WHERE title IS NULL AND original_name IS NOT NULL;
