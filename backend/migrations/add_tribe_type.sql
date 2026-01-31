-- Add tribe_type column to tribes table
-- Set all existing tribes to 'friend' type as requested

ALTER TABLE tribes 
ADD COLUMN tribe_type TEXT NOT NULL DEFAULT 'friend';

-- Remove default for future inserts (admin must explicitly choose)
ALTER TABLE tribes 
ALTER COLUMN tribe_type DROP DEFAULT;
