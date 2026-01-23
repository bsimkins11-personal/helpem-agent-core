-- Migration: 1-Month Free Trial with $5 Usage Cap
-- Purpose: Track trial usage and API costs for trial users

-- Add subscription tracking to users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_ended_reason VARCHAR(50);

-- Values: 'free', 'trial', 'basic', 'premium'
COMMENT ON COLUMN users.subscription_tier IS 'Current subscription tier';
COMMENT ON COLUMN users.trial_used IS 'Has user ever used their one-time 30-day trial';
COMMENT ON COLUMN users.trial_ended_reason IS 'Why trial ended: time_expired, budget_exceeded, upgraded, cancelled';

-- Trial usage tracking table
CREATE TABLE IF NOT EXISTS trial_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Trial tracking
  trial_started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  trial_expires_at TIMESTAMP NOT NULL, -- 30 days from start
  trial_ended_at TIMESTAMP,
  trial_status VARCHAR(20) NOT NULL DEFAULT 'active',
  
  -- Usage tracking
  total_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0.00,
  cost_cap_usd DECIMAL(10,4) NOT NULL DEFAULT 5.00,
  
  -- Operation counters
  ai_messages_count INT NOT NULL DEFAULT 0,
  ai_messages_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0.00,
  
  voice_input_minutes INT NOT NULL DEFAULT 0,
  voice_input_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0.00,
  
  voice_output_chars INT NOT NULL DEFAULT 0,
  voice_output_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0.00,
  
  calendar_syncs INT NOT NULL DEFAULT 0,
  calendar_syncs_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0.00,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE (user_id),
  CHECK (total_cost_usd >= 0),
  CHECK (cost_cap_usd > 0),
  CHECK (total_cost_usd <= cost_cap_usd + 0.50), -- Allow 10% overflow
  CHECK (trial_status IN ('active', 'expired', 'upgraded', 'cancelled'))
);

-- Indices for trial usage
CREATE INDEX IF NOT EXISTS idx_trial_usage_status 
  ON trial_usage(trial_status, trial_expires_at);

CREATE INDEX IF NOT EXISTS idx_trial_usage_user 
  ON trial_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_trial_usage_expires 
  ON trial_usage(trial_expires_at) 
  WHERE trial_status = 'active';

-- Function to check if trial is still valid
CREATE OR REPLACE FUNCTION is_trial_valid(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_trial trial_usage%ROWTYPE;
BEGIN
  SELECT * INTO v_trial
  FROM trial_usage
  WHERE user_id = p_user_id
    AND trial_status = 'active';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if expired by time
  IF v_trial.trial_expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Check if over budget (with 10% grace)
  IF v_trial.total_cost_usd >= (v_trial.cost_cap_usd + 0.50) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get trial usage percentage
CREATE OR REPLACE FUNCTION get_trial_usage_percent(p_user_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_usage trial_usage%ROWTYPE;
BEGIN
  SELECT * INTO v_usage
  FROM trial_usage
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0.00;
  END IF;
  
  RETURN (v_usage.total_cost_usd / v_usage.cost_cap_usd) * 100;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trial_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trial_usage_updated_at
  BEFORE UPDATE ON trial_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_trial_usage_timestamp();

-- Grant permissions (if using restricted database user)
-- GRANT SELECT, INSERT, UPDATE ON trial_usage TO your_app_user;
-- GRANT EXECUTE ON FUNCTION is_trial_valid TO your_app_user;
-- GRANT EXECUTE ON FUNCTION get_trial_usage_percent TO your_app_user;

-- Sample query to check trial status
COMMENT ON TABLE trial_usage IS 'Tracks API usage for 30-day free trial with $5 cap';
COMMENT ON COLUMN trial_usage.trial_status IS 'active, expired, upgraded, cancelled';
COMMENT ON COLUMN trial_usage.cost_cap_usd IS 'Maximum API cost allowed (default $5.00)';
COMMENT ON COLUMN trial_usage.total_cost_usd IS 'Running total of API costs';
