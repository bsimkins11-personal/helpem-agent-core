-- Referral/Evangelist Program Migration
-- Adds referral tracking, activity days, and reward system

-- Add referral fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_code" TEXT UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_by_user_id" UUID;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_at" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "evangelist_badge_expires_at" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "evangelist_lifetime_count" INT DEFAULT 0;

-- Add indexes for referral fields
CREATE INDEX IF NOT EXISTS "idx_users_referral_code" ON "users" ("referral_code");
CREATE INDEX IF NOT EXISTS "idx_users_referred_by" ON "users" ("referred_by_user_id");

-- User Activity Days table - tracks distinct active days per user
CREATE TABLE IF NOT EXISTS "user_activity_days" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("user_id", "date")
);

CREATE INDEX IF NOT EXISTS "idx_user_activity_days_user_date" ON "user_activity_days" ("user_id", "date");

-- Referral Rewards table - tracks awarded Evangelist badges
CREATE TABLE IF NOT EXISTS "referral_rewards" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "inviter_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "referee_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "awarded_at" TIMESTAMPTZ DEFAULT NOW(),
  "badge_expires_at" TIMESTAMPTZ NOT NULL,
  "award_month" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_referral_rewards_inviter_month" ON "referral_rewards" ("inviter_id", "award_month");
CREATE INDEX IF NOT EXISTS "idx_referral_rewards_referee" ON "referral_rewards" ("referee_id");
