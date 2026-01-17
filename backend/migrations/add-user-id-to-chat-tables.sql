-- Migration: Add user_id to chat-related tables for proper user isolation
-- Run this to make chat history user-specific

-- 1. Add user_id to user_inputs table
ALTER TABLE user_inputs 
  ADD COLUMN user_id UUID;

-- Create index for faster queries
CREATE INDEX idx_user_inputs_user_id ON user_inputs(user_id);

-- 2. Add user_id to chat_messages table
ALTER TABLE chat_messages 
  ADD COLUMN user_id UUID;

-- Create index for faster queries
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);

-- 3. Note: We keep session_id for backward compatibility
-- But going forward, all queries should filter by user_id

-- To clean up data without user_id (optional):
-- DELETE FROM user_inputs WHERE user_id IS NULL;
-- DELETE FROM chat_messages WHERE user_id IS NULL;
