-- Migration: 001_create_users_table
-- Description: Create users table for Apple Sign-In authentication
-- Run this on your Railway Postgres database before deploying

-- Users table
-- Stores Apple user identifiers as the sole identity mechanism
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apple_user_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by Apple user ID (primary auth path)
CREATE INDEX IF NOT EXISTS idx_users_apple_user_id ON users(apple_user_id);

-- Optional: Add agent_state column for future use
-- ALTER TABLE users ADD COLUMN agent_state JSONB DEFAULT '{}';

-- Verify table was created
SELECT 'users table created successfully' AS status;
