-- Migration script to add 'included' column to events table
-- Run this in your Supabase SQL editor if you have existing data

-- Add the included column with default value TRUE
ALTER TABLE events ADD COLUMN IF NOT EXISTS included BOOLEAN DEFAULT TRUE;

-- Update any existing events to be included by default
UPDATE events SET included = TRUE WHERE included IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN events.included IS 'Whether this event is included in grade calculations (TRUE) or excluded (FALSE)';

