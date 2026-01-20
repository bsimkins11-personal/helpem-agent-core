-- Add duration to appointments (minutes)
ALTER TABLE "appointments"
ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "appointments"
ADD COLUMN IF NOT EXISTS "with_whom" TEXT;
