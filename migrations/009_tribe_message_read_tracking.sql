-- Migration: Tribe Message Read Tracking
-- Purpose: Track when users last read tribe messages for daily unread notifications

-- Add last_read_at to tribe_members
ALTER TABLE tribe_members 
  ADD COLUMN IF NOT EXISTS last_read_messages_at TIMESTAMP DEFAULT NOW();

COMMENT ON COLUMN tribe_members.last_read_messages_at IS 'Last time user viewed tribe messages';

-- Create index for efficient unread message queries
CREATE INDEX IF NOT EXISTS idx_tribe_members_last_read 
  ON tribe_members(tribe_id, user_id, last_read_messages_at);

-- Add notification preferences for daily digest
ALTER TABLE tribe_members
  ADD COLUMN IF NOT EXISTS daily_unread_notif BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN tribe_members.daily_unread_notif IS 'Send daily notification for unread messages';

-- Function to count unread messages for a user in a tribe
CREATE OR REPLACE FUNCTION get_unread_message_count(
  p_user_id UUID,
  p_tribe_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_last_read TIMESTAMP;
  v_unread_count INTEGER;
BEGIN
  -- Get last read timestamp
  SELECT last_read_messages_at INTO v_last_read
  FROM tribe_members
  WHERE user_id = p_user_id
    AND tribe_id = p_tribe_id
    AND accepted_at IS NOT NULL
    AND left_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Count messages since last read
  SELECT COUNT(*) INTO v_unread_count
  FROM tribe_messages
  WHERE tribe_id = p_tribe_id
    AND created_at > v_last_read
    AND deleted_at IS NULL
    AND user_id != p_user_id; -- Don't count own messages
  
  RETURN v_unread_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get all users with unread messages (for daily notifications)
CREATE OR REPLACE FUNCTION get_users_with_unread_messages()
RETURNS TABLE(
  user_id UUID,
  tribe_id UUID,
  tribe_name VARCHAR,
  unread_count BIGINT,
  last_read_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.user_id,
    tm.tribe_id,
    t.name as tribe_name,
    COUNT(tmsg.id) as unread_count,
    tm.last_read_messages_at as last_read_at
  FROM tribe_members tm
  JOIN tribes t ON t.id = tm.tribe_id
  LEFT JOIN tribe_messages tmsg ON 
    tmsg.tribe_id = tm.tribe_id
    AND tmsg.created_at > tm.last_read_messages_at
    AND tmsg.deleted_at IS NULL
    AND tmsg.user_id != tm.user_id -- Exclude own messages
  WHERE tm.accepted_at IS NOT NULL
    AND tm.left_at IS NULL
    AND tm.daily_unread_notif = TRUE
    AND t.deleted_at IS NULL
  GROUP BY tm.user_id, tm.tribe_id, t.name, tm.last_read_messages_at
  HAVING COUNT(tmsg.id) > 0; -- Only users with unread messages
END;
$$ LANGUAGE plpgsql;

-- Update last_read_messages_at function (call from API)
CREATE OR REPLACE FUNCTION mark_tribe_messages_read(
  p_user_id UUID,
  p_tribe_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE tribe_members
  SET last_read_messages_at = NOW()
  WHERE user_id = p_user_id
    AND tribe_id = p_tribe_id;
END;
$$ LANGUAGE plpgsql;

-- Sample queries for testing
COMMENT ON FUNCTION get_unread_message_count IS 'Returns count of unread messages for user in tribe';
COMMENT ON FUNCTION get_users_with_unread_messages IS 'Returns all users with unread messages (for daily digest)';
COMMENT ON FUNCTION mark_tribe_messages_read IS 'Mark all tribe messages as read for user';
