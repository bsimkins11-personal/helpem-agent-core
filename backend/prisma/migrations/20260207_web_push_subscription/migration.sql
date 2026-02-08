-- Add push_subscription column to user_devices for Web Push
ALTER TABLE "user_devices" ADD COLUMN "push_subscription" JSONB;
