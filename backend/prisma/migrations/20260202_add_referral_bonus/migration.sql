-- Add referral bonus expires field for 2 free months reward
ALTER TABLE "users" ADD COLUMN "referral_bonus_expires_at" TIMESTAMP(3);

-- Add earned premium months for inviters (every 3 signups = 1 month)
ALTER TABLE "users" ADD COLUMN "earned_premium_months" INTEGER NOT NULL DEFAULT 0;

-- Add yearly cap tracking (max 3 premium months per year)
ALTER TABLE "users" ADD COLUMN "premium_months_this_year" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "premium_months_year" INTEGER;
