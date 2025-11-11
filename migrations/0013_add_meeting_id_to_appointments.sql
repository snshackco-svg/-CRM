-- Add meeting_id column to new_appointments table
-- This links appointments to their corresponding meetings

ALTER TABLE new_appointments ADD COLUMN meeting_id INTEGER REFERENCES meetings(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_new_appointments_meeting_id ON new_appointments(meeting_id);
