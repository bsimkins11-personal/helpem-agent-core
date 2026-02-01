-- Add is_admin column to tribe_members table
-- Admins can manage tribe settings and members (similar to owner)
ALTER TABLE "tribe_members" ADD COLUMN IF NOT EXISTS "is_admin" BOOLEAN NOT NULL DEFAULT FALSE;
