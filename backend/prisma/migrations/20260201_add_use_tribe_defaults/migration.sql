-- Add use_tribe_defaults column to tribe_members table
-- When true, member uses tribe-level default permissions (inherited)
-- When false, member has custom permissions that override tribe defaults
ALTER TABLE "tribe_members" ADD COLUMN IF NOT EXISTS "use_tribe_defaults" BOOLEAN NOT NULL DEFAULT TRUE;
