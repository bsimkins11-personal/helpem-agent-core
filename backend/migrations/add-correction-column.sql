-- Add correction column to existing feedback table
-- For users who provide explanation when giving thumbs down

ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS correction TEXT;

CREATE INDEX IF NOT EXISTS idx_feedback_has_correction 
ON feedback ((correction IS NOT NULL));

COMMENT ON COLUMN feedback.correction IS 'User explanation of what the AI should have done (for thumbs down feedback)';

-- Query to find valuable corrections for training
-- SELECT user_message, assistant_response, correction 
-- FROM feedback 
-- WHERE feedback = 'down' AND correction IS NOT NULL
-- ORDER BY created_at DESC;
