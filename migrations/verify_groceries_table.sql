-- ============================================
-- GROCERIES TABLE VERIFICATION & MIGRATION
-- ============================================
-- Run this script to verify/create the groceries table
-- Database: Railway Postgres
-- Date: 2026-01-19
-- ============================================

-- 1. Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'groceries'
) AS groceries_table_exists;

-- 2. If table doesn't exist, create it (this is idempotent)
CREATE TABLE IF NOT EXISTS groceries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_groceries_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_groceries_user_id 
    ON groceries(user_id);

CREATE INDEX IF NOT EXISTS idx_groceries_completed 
    ON groceries(user_id, completed);

CREATE INDEX IF NOT EXISTS idx_groceries_created_at 
    ON groceries(created_at);

-- 4. Verify table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'groceries'
ORDER BY ordinal_position;

-- 5. Count existing grocery items
SELECT COUNT(*) AS total_grocery_items FROM groceries;

-- 6. Verify indexes were created
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'groceries';

-- ============================================
-- EXPECTED OUTPUT (if successful):
-- ============================================
-- groceries_table_exists: true
-- 
-- Table structure:
-- - id (uuid, not null, default: gen_random_uuid())
-- - user_id (uuid, not null)
-- - content (text, not null)
-- - completed (boolean, default: false)
-- - completed_at (timestamp, nullable)
-- - created_at (timestamp, default: now())
--
-- Indexes:
-- - groceries_pkey (PRIMARY KEY on id)
-- - idx_groceries_user_id (on user_id)
-- - idx_groceries_completed (on user_id, completed)
-- - idx_groceries_created_at (on created_at)
--
-- Foreign Keys:
-- - fk_groceries_user (user_id → users.id ON DELETE CASCADE)
-- ============================================

-- ============================================
-- ROLLBACK (if needed - use with caution!)
-- ============================================
-- Uncomment to drop the table and start over:
-- DROP TABLE IF EXISTS groceries CASCADE;
-- ============================================
