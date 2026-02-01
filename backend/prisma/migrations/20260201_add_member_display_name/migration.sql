-- Add display_name column to tribe_members table
ALTER TABLE "tribe_members" ADD COLUMN IF NOT EXISTS "display_name" VARCHAR(255);
