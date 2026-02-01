-- Add email and phone fields to users table for contact matching
ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;

-- Create unique indexes (allow nulls, but each non-null value must be unique)
CREATE UNIQUE INDEX "users_email_key" ON "users"("email") WHERE "email" IS NOT NULL;
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone") WHERE "phone" IS NOT NULL;

-- Create regular indexes for fast lookups
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_phone_idx" ON "users"("phone");
