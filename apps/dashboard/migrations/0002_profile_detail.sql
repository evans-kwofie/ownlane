-- A canonical profile holds what platforms ask for, not just what a person
-- types first. Three bio lengths exist because platforms cap them differently:
-- a tagline for X, a summary for LinkedIn, the full text for an owned page.

ALTER TABLE profiles ADD COLUMN handle TEXT;
ALTER TABLE profiles ADD COLUMN pronunciation TEXT;
ALTER TABLE profiles ADD COLUMN pronouns TEXT;
ALTER TABLE profiles ADD COLUMN profession TEXT;
ALTER TABLE profiles ADD COLUMN medium_bio TEXT;
ALTER TABLE profiles ADD COLUMN categories TEXT;
ALTER TABLE profiles ADD COLUMN skills TEXT;
ALTER TABLE profiles ADD COLUMN languages TEXT;
ALTER TABLE profiles ADD COLUMN public_email TEXT;
ALTER TABLE profiles ADD COLUMN phone TEXT;
ALTER TABLE profiles ADD COLUMN whatsapp TEXT;
ALTER TABLE profiles ADD COLUMN booking_url TEXT;
