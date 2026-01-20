-- Add optional fields to appointments table
-- Safe to run multiple times (uses IF NOT EXISTS)

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS topic TEXT;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add index for common queries
CREATE INDEX IF NOT EXISTS appointments_datetime_idx ON appointments(datetime);

COMMENT ON COLUMN appointments.topic IS 'What the appointment is about (optional)';
COMMENT ON COLUMN appointments.location IS 'Where the appointment is (optional)';
