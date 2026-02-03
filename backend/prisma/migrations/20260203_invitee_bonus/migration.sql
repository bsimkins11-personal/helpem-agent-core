-- Add invitee bonus fields to track when referred users receive their +1 free month
ALTER TABLE "referral_progress" ADD COLUMN "invitee_bonus_granted_at" TIMESTAMP(3);
ALTER TABLE "referral_progress" ADD COLUMN "invitee_bonus_product_id" VARCHAR(255);
