-- Add feedback table for RLHF (Reinforcement Learning from Human Feedback)
-- This table stores user thumbs up/down feedback on AI responses

CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) NOT NULL,
    feedback VARCHAR(10) NOT NULL CHECK (feedback IN ('up', 'down')),
    user_message TEXT NOT NULL,
    assistant_response TEXT NOT NULL,
    action_type VARCHAR(50),
    action_data JSONB,
    correction TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(feedback);
CREATE INDEX IF NOT EXISTS idx_feedback_action ON feedback(action_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_has_correction ON feedback((correction IS NOT NULL));

COMMENT ON TABLE feedback IS 'User feedback on AI responses for reinforcement learning';
COMMENT ON COLUMN feedback.feedback IS 'User rating: up (good) or down (bad)';
COMMENT ON COLUMN feedback.user_message IS 'Original user input that triggered the response';
COMMENT ON COLUMN feedback.assistant_response IS 'AI generated response text';
COMMENT ON COLUMN feedback.action_type IS 'Type of action taken (todo, appointment, routine, grocery)';
COMMENT ON COLUMN feedback.action_data IS 'Full action JSON data for analysis';
COMMENT ON COLUMN feedback.correction IS 'User explanation of what went wrong (for thumbs down)';