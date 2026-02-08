-- Make apple_user_id optional (for Google-only users)
ALTER TABLE "users" ALTER COLUMN "apple_user_id" DROP NOT NULL;

-- Add Google Sign-In support
ALTER TABLE "users" ADD COLUMN "google_user_id" TEXT;
CREATE UNIQUE INDEX "users_google_user_id_key" ON "users"("google_user_id");

-- Add Stripe customer ID (for Phase 2 billing)
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" TEXT;
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");
