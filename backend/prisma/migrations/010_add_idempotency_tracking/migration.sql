-- Add idempotency key to proposals
ALTER TABLE "tribe_proposals" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

-- Create idempotency tracking table for proposal actions
CREATE TABLE IF NOT EXISTS "tribe_proposal_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "tribe_proposal_actions_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "tribe_proposal_actions_proposal_id_user_id_idx" 
    ON "tribe_proposal_actions"("proposal_id", "user_id");
CREATE INDEX IF NOT EXISTS "tribe_proposal_actions_idempotency_key_idx" 
    ON "tribe_proposal_actions"("idempotency_key");

-- Add unique constraints
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "tribe_proposal_actions_idempotency_key_key" 
        ON "tribe_proposal_actions"("idempotency_key");
EXCEPTION
    WHEN duplicate_table THEN RAISE NOTICE 'Index already exists.';
END $$;

DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "tribe_proposal_actions_user_id_idempotency_key_key" 
        ON "tribe_proposal_actions"("user_id", "idempotency_key");
EXCEPTION
    WHEN duplicate_table THEN RAISE NOTICE 'Index already exists.';
END $$;
