-- Migration script for Study Planner
-- Use this when: (1) you have an existing database with an older schema, or
-- (2) events/todos are failing to save (missing columns).
-- For a FRESH database, run the full schema in README.md first instead.
-- Safe to run multiple times (uses IF NOT EXISTS).

-- EVENTS: Add missing columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS included BOOLEAN DEFAULT TRUE;

-- Add columns for calendar events and course events (start_time, end_time, description, color)
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS color TEXT;

-- Make date nullable (personal calendar events don't use date)
ALTER TABLE events ALTER COLUMN date DROP NOT NULL;

-- Update any existing events to be included by default
UPDATE events SET included = TRUE WHERE included IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN events.included IS 'Whether this event is included in grade calculations (TRUE) or excluded (FALSE)';
COMMENT ON COLUMN events.start_time IS 'Start time for calendar events';
COMMENT ON COLUMN events.end_time IS 'End time for calendar events';

-- Todos: add due_date if missing (for "Could not find due_date column" error)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS due_date DATE;

