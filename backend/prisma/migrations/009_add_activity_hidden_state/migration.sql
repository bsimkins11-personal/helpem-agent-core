-- Add per-user hidden state for activity entries
CREATE TABLE IF NOT EXISTS "tribe_activity_hidden_by" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activity_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "hidden_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "tribe_activity_hidden_by_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "tribe_activity_hidden_by_activity_id_user_id_idx" 
    ON "tribe_activity_hidden_by"("activity_id", "user_id");
CREATE INDEX IF NOT EXISTS "tribe_activity_hidden_by_user_id_hidden_at_idx" 
    ON "tribe_activity_hidden_by"("user_id", "hidden_at");

-- Add unique constraint (one hidden entry per user per activity)
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "tribe_activity_hidden_by_activity_id_user_id_key" 
        ON "tribe_activity_hidden_by"("activity_id", "user_id");
EXCEPTION
    WHEN duplicate_table THEN RAISE NOTICE 'Index already exists.';
END $$;

-- Add foreign key
DO $$ BEGIN
    ALTER TABLE "tribe_activity_hidden_by" ADD CONSTRAINT "tribe_activity_hidden_by_activity_id_fkey" 
        FOREIGN KEY ("activity_id") REFERENCES "tribe_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN RAISE NOTICE 'Foreign key already exists.';
END $$;
