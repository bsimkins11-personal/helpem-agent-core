-- Learning Metrics Table
-- Tracks AI performance over time for continuous improvement monitoring

CREATE TABLE IF NOT EXISTS learning_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_feedback INTEGER NOT NULL,
    approval_rate DECIMAL(5,2) NOT NULL,
    thumbs_up INTEGER NOT NULL,
    thumbs_down INTEGER NOT NULL,
    action_breakdown JSONB,
    model_version VARCHAR(100),
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure we don't duplicate metrics for the same timestamp
    UNIQUE (measured_at)
);

CREATE INDEX IF NOT EXISTS idx_learning_metrics_measured ON learning_metrics(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_metrics_approval ON learning_metrics(approval_rate);

COMMENT ON TABLE learning_metrics IS 'Tracks AI performance metrics over time for continuous learning';
COMMENT ON COLUMN learning_metrics.approval_rate IS 'Percentage of thumbs up vs total feedback';
COMMENT ON COLUMN learning_metrics.action_breakdown IS 'Approval rates by action type (todo, appointment, etc)';
COMMENT ON COLUMN learning_metrics.model_version IS 'Which fine-tuned model version was active';
