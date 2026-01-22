-- Add type column to user_inputs if it doesn't exist
-- This migration is idempotent and safe to run multiple times

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_inputs' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE "user_inputs" 
        ADD COLUMN "type" TEXT NOT NULL DEFAULT 'text';
        
        RAISE NOTICE 'Added type column to user_inputs table';
    ELSE
        RAISE NOTICE 'type column already exists in user_inputs table';
    END IF;
END $$;
