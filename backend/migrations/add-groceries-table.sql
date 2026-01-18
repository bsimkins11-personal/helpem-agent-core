-- Add groceries table for persistent grocery list items
-- Each user has their own grocery items

CREATE TABLE IF NOT EXISTS groceries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure user exists
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_groceries_user_id ON groceries(user_id);

-- Index for filtering by completion status
CREATE INDEX IF NOT EXISTS idx_groceries_completed ON groceries(user_id, completed);

-- Add comment
COMMENT ON TABLE groceries IS 'User grocery list items with completion tracking';
