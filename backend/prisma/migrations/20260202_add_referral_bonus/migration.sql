-- Add referral bonus expires field for 2 free months reward
ALTER TABLE "users" ADD COLUMN "referral_bonus_expires_at" TIMESTAMP(3);

-- Add earned premium months for inviters (every 5 signups = 1 month)
ALTER TABLE "users" ADD COLUMN "earned_premium_months" INTEGER NOT NULL DEFAULT 0;
