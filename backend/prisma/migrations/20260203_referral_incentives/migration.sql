-- Add first meaningful use timestamp
ALTER TABLE "users" ADD COLUMN "first_meaningful_use_at" TIMESTAMP(3);

-- Update referral_rewards for premium month rewards
ALTER TABLE "referral_rewards" ALTER COLUMN "badge_expires_at" DROP NOT NULL;
ALTER TABLE "referral_rewards" ADD COLUMN "reward_type" TEXT NOT NULL DEFAULT 'premium_month';
ALTER TABLE "referral_rewards" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'earned';
ALTER TABLE "referral_rewards" ADD COLUMN "starts_at" TIMESTAMP(3);
ALTER TABLE "referral_rewards" ADD COLUMN "ends_at" TIMESTAMP(3);
ALTER TABLE "referral_rewards" ADD COLUMN "metadata" JSONB;

-- Referral progress tracking
CREATE TABLE "referral_progress" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "inviter_id" UUID NOT NULL,
  "referee_id" UUID NOT NULL,
  "signup_at" TIMESTAMP(3) NOT NULL,
  "eligibility_ends_at" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "open_days_required" INTEGER NOT NULL DEFAULT 5,
  "open_days_count" INTEGER NOT NULL DEFAULT 0,
  "usage_qualified_at" TIMESTAMP(3),
  "paid_qualified_at" TIMESTAMP(3),
  "rewarded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "referral_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referral_progress_referee_id_key" ON "referral_progress" ("referee_id");
CREATE INDEX "referral_progress_inviter_id_status_idx" ON "referral_progress" ("inviter_id", "status");
CREATE INDEX "referral_progress_inviter_id_eligibility_ends_at_idx" ON "referral_progress" ("inviter_id", "eligibility_ends_at");

ALTER TABLE "referral_progress"
  ADD CONSTRAINT "referral_progress_inviter_id_fkey"
  FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_progress"
  ADD CONSTRAINT "referral_progress_referee_id_fkey"
  FOREIGN KEY ("referee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- User subscription status (Apple IAP)
CREATE TABLE "user_subscription_status" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'apple',
  "product_id" TEXT,
  "status" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "environment" TEXT,
  "app_account_token" TEXT,
  "current_period_start" TIMESTAMP(3),
  "current_period_end" TIMESTAMP(3),
  "first_paid_at" TIMESTAMP(3),
  "last_paid_at" TIMESTAMP(3),
  "original_transaction_id" TEXT,
  "latest_transaction_id" TEXT,
  "last_event_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "user_subscription_status_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_subscription_status_user_id_platform_key" ON "user_subscription_status" ("user_id", "platform");
CREATE INDEX "user_subscription_status_status_idx" ON "user_subscription_status" ("status");

ALTER TABLE "user_subscription_status"
  ADD CONSTRAINT "user_subscription_status_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- App Store Server Notifications (v2)
CREATE TABLE "app_store_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "notification_uuid" TEXT,
  "notification_type" TEXT,
  "subtype" TEXT,
  "environment" TEXT,
  "bundle_id" TEXT,
  "app_apple_id" TEXT,
  "user_id" UUID,
  "original_transaction_id" TEXT,
  "latest_transaction_id" TEXT,
  "signed_payload" TEXT NOT NULL,
  "decoded_payload" JSONB,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "processed_at" TIMESTAMP(3),
  CONSTRAINT "app_store_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "app_store_notifications_notification_uuid_idx" ON "app_store_notifications" ("notification_uuid");
CREATE INDEX "app_store_notifications_notification_type_idx" ON "app_store_notifications" ("notification_type");
CREATE INDEX "app_store_notifications_user_id_idx" ON "app_store_notifications" ("user_id");
CREATE INDEX "app_store_notifications_original_transaction_id_idx" ON "app_store_notifications" ("original_transaction_id");

ALTER TABLE "app_store_notifications"
  ADD CONSTRAINT "app_store_notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
