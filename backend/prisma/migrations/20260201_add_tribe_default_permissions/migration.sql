-- Add default permission columns to tribes table
ALTER TABLE "tribes" ADD COLUMN "default_tasks_permission" TEXT NOT NULL DEFAULT 'propose';
ALTER TABLE "tribes" ADD COLUMN "default_appointments_permission" TEXT NOT NULL DEFAULT 'propose';
ALTER TABLE "tribes" ADD COLUMN "default_routines_permission" TEXT NOT NULL DEFAULT 'propose';
ALTER TABLE "tribes" ADD COLUMN "default_groceries_permission" TEXT NOT NULL DEFAULT 'propose';
