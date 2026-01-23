# 1-Month Free Trial with $5 Usage Cap

## Overview

New tier structure that gives users a full month to experience the basic package with a $5 usage cap. This simulates the paid experience without commitment.

## Updated Tier Structure

### 🆓 Free (Forever)
- **Price:** $0
- **Features:**
  - 10 active todos
  - 5 appointments
  - 5 habits
  - 50 AI messages/month
  - Premium voice (neural TTS)
  - Basic notifications

**Goal:** Let users try the app with minimal friction

---

### 🎁 1-Month Free Trial (NEW!)
- **Price:** $0 for 30 days OR until $5 API usage
- **Features:** Everything in Basic package
  - 100 todos, 50 appointments, 20 habits
  - 300 AI messages (or until $5 API cost)
  - Premium voice unlimited
  - Calendar sync
  - Data export
  - Cloud backup
  - **Usage Cap:** $5 API costs (transparent tracking)

**Value Proposition:**  
*"Experience the full Basic package free for a month! Track your usage in real-time. Zero commitment."*

**Target:** 40-50% trial activation rate from free users

**Trial Rules:**
- Ends after 30 days OR $5 API usage (whichever comes first)
- One trial per user (lifetime)
- Must upgrade to continue after trial
- No credit card required to start

---

### ⭐ Basic - $7.99/month
- **Price:** $7.99/month or $79/year
- **Features:**
  - 100 todos, 50 appointments, 20 habits
  - 300 AI messages/month (~$2.50/mo API cost)
  - Calendar sync
  - Data export
  - Cloud backup
  - Email support (24-48hr)

**Conversion:** From trial or free tier

---

### 💎 Premium - $14.99/month
- **Price:** $14.99/month or $149/year
- **Features:**
  - Unlimited everything
  - Unlimited AI messages (3,000/mo fair use = ~$25/mo API cost)
  - Advanced AI features
  - Voice customization
  - Priority support (4hr response)
  - Analytics dashboard

**Conversion:** From basic tier (upsell)

---

## API Cost Tracking System

### Cost Per Operation

Based on your current OpenAI/AI costs:

| Operation | Estimated Cost | Notes |
|-----------|----------------|-------|
| AI Message (GPT-4o-mini) | $0.008 | ~800 tokens avg |
| Voice Input (Whisper) | $0.006 | Per minute |
| Voice Output (TTS) | $0.015 | Per 1000 chars |
| Calendar Sync | $0.001 | API call |
| Data Export | $0.001 | One-time |

**Average $5 Trial Gives:**
- ~625 AI messages (vs 300 in Basic)
- OR mix of operations totaling $5

### Real-Time Tracking

Users see their trial "budget" in real-time:

```
🎁 Trial Usage
━━━━━━━━━━━━ 45% ($2.25 of $5.00 used)

• AI Messages: 280 ($2.24)
• Voice Commands: 5 ($0.01)
• 22 days remaining

[Upgrade to Remove Limits]
```

---

## Database Schema

### New Tables

```sql
-- Trial usage tracking
CREATE TABLE trial_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Trial tracking
  trial_started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  trial_expires_at TIMESTAMP NOT NULL, -- 30 days from start
  trial_ended_at TIMESTAMP,
  trial_status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, expired, upgraded, cancelled
  
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
  UNIQUE (user_id), -- One trial per user
  CHECK (total_cost_usd <= cost_cap_usd + 0.50), -- Allow 10% overflow before hard stop
  CHECK (trial_status IN ('active', 'expired', 'upgraded', 'cancelled'))
);

-- Index for checking active trials
CREATE INDEX idx_trial_usage_status ON trial_usage(trial_status, trial_expires_at);

-- Index for user lookups
CREATE INDEX idx_trial_usage_user ON trial_usage(user_id);

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
  
  -- Check if over budget
  IF v_trial.total_cost_usd >= v_trial.cost_cap_usd THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Update User Schema

```sql
-- Add trial status to users table
ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
-- tiers: 'free', 'trial', 'basic', 'premium'

ALTER TABLE users ADD COLUMN trial_used BOOLEAN DEFAULT FALSE;
-- Tracks if user has ever used their one-time trial

ALTER TABLE users ADD COLUMN trial_ended_reason VARCHAR(50);
-- 'time_expired', 'budget_exceeded', 'upgraded', 'cancelled'
```

---

## Backend Implementation

### 1. Cost Tracking Middleware

```javascript
// backend/src/middleware/trackCost.js

const { query } = require('../lib/db');

/**
 * Middleware to track API usage costs for trial users
 */
async function trackAPICost(userId, operation, details = {}) {
  // Check if user is on trial
  const userResult = await query(
    'SELECT subscription_tier FROM users WHERE id = $1',
    [userId]
  );
  
  if (!userResult.rows[0] || userResult.rows[0].subscription_tier !== 'trial') {
    return; // Only track for trial users
  }
  
  // Calculate cost based on operation
  let cost = 0;
  let updateQuery = '';
  let updateParams = [];
  
  switch (operation) {
    case 'ai_message':
      cost = 0.008; // $0.008 per message
      updateQuery = `
        UPDATE trial_usage 
        SET ai_messages_count = ai_messages_count + 1,
            ai_messages_cost_usd = ai_messages_cost_usd + $1,
            total_cost_usd = total_cost_usd + $1,
            updated_at = NOW()
        WHERE user_id = $2 AND trial_status = 'active'
        RETURNING total_cost_usd, cost_cap_usd
      `;
      updateParams = [cost, userId];
      break;
      
    case 'voice_input':
      const minutes = details.durationSeconds / 60;
      cost = minutes * 0.006; // $0.006 per minute
      updateQuery = `
        UPDATE trial_usage 
        SET voice_input_minutes = voice_input_minutes + $1,
            voice_input_cost_usd = voice_input_cost_usd + $2,
            total_cost_usd = total_cost_usd + $2,
            updated_at = NOW()
        WHERE user_id = $3 AND trial_status = 'active'
        RETURNING total_cost_usd, cost_cap_usd
      `;
      updateParams = [Math.ceil(minutes), cost, userId];
      break;
      
    case 'voice_output':
      const chars = details.characterCount || 0;
      cost = (chars / 1000) * 0.015; // $0.015 per 1000 chars
      updateQuery = `
        UPDATE trial_usage 
        SET voice_output_chars = voice_output_chars + $1,
            voice_output_cost_usd = voice_output_cost_usd + $2,
            total_cost_usd = total_cost_usd + $2,
            updated_at = NOW()
        WHERE user_id = $3 AND trial_status = 'active'
        RETURNING total_cost_usd, cost_cap_usd
      `;
      updateParams = [chars, cost, userId];
      break;
      
    case 'calendar_sync':
      cost = 0.001; // $0.001 per sync
      updateQuery = `
        UPDATE trial_usage 
        SET calendar_syncs = calendar_syncs + 1,
            calendar_syncs_cost_usd = calendar_syncs_cost_usd + $1,
            total_cost_usd = total_cost_usd + $1,
            updated_at = NOW()
        WHERE user_id = $2 AND trial_status = 'active'
        RETURNING total_cost_usd, cost_cap_usd
      `;
      updateParams = [cost, userId];
      break;
      
    default:
      console.warn(`Unknown operation for cost tracking: ${operation}`);
      return;
  }
  
  // Update usage
  try {
    const result = await query(updateQuery, updateParams);
    
    if (result.rows.length === 0) {
      console.log(`No active trial found for user ${userId}`);
      return;
    }
    
    const { total_cost_usd, cost_cap_usd } = result.rows[0];
    
    console.log(`💰 Trial usage for ${userId}: $${total_cost_usd}/$${cost_cap_usd} (${operation})`);
    
    // Check if trial should be expired due to budget
    if (parseFloat(total_cost_usd) >= parseFloat(cost_cap_usd)) {
      await expireTrialBudget(userId);
    }
    
  } catch (error) {
    console.error(`Error tracking cost for ${userId}:`, error);
    // Don't fail the request if tracking fails
  }
}

async function expireTrialBudget(userId) {
  console.log(`💸 Trial budget exceeded for user ${userId}, expiring trial`);
  
  await query(`
    UPDATE trial_usage
    SET trial_status = 'expired',
        trial_ended_at = NOW()
    WHERE user_id = $1 AND trial_status = 'active'
  `, [userId]);
  
  await query(`
    UPDATE users
    SET subscription_tier = 'free',
        trial_ended_reason = 'budget_exceeded'
    WHERE id = $1
  `, [userId]);
  
  // TODO: Send notification to user
  // await sendTrialExpiredEmail(userId, 'budget');
}

module.exports = { trackAPICost };
```

### 2. Trial Activation Endpoint

```javascript
// backend/src/routes/subscriptions.js

const express = require('express');
const router = express.Router();
const { verifySessionToken } = require('../lib/sessionAuth');
const { query } = require('../lib/db');

/**
 * POST /subscriptions/start-trial
 * Activate 1-month free trial with $5 usage cap
 */
router.post('/start-trial', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.userId;
    
    // Check if user already used trial
    const userCheck = await query(
      'SELECT subscription_tier, trial_used FROM users WHERE id = $1',
      [userId]
    );
    
    if (!userCheck.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userCheck.rows[0];
    
    if (user.trial_used) {
      return res.status(400).json({ 
        error: 'Trial already used',
        message: 'You can only use the free trial once per account.'
      });
    }
    
    if (user.subscription_tier !== 'free') {
      return res.status(400).json({ 
        error: 'Invalid tier',
        message: 'You must be on the free tier to start a trial.'
      });
    }
    
    // Create trial usage record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
    
    await query(`
      INSERT INTO trial_usage (
        user_id,
        trial_started_at,
        trial_expires_at,
        trial_status,
        cost_cap_usd
      ) VALUES ($1, NOW(), $2, 'active', 5.00)
    `, [userId, expiresAt]);
    
    // Update user tier
    await query(`
      UPDATE users
      SET subscription_tier = 'trial',
          trial_used = TRUE
      WHERE id = $1
    `, [userId]);
    
    console.log(`✅ Started trial for user ${userId}, expires ${expiresAt.toISOString()}`);
    
    return res.json({
      success: true,
      message: 'Trial activated! Enjoy 30 days or $5 of usage.',
      expiresAt: expiresAt.toISOString(),
      costCap: '5.00',
      tier: 'trial'
    });
    
  } catch (error) {
    console.error('ERROR POST /subscriptions/start-trial:', error);
    return res.status(500).json({ error: 'Failed to start trial' });
  }
});

/**
 * GET /subscriptions/trial-usage
 * Get current trial usage stats
 */
router.get('/trial-usage', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.userId;
    
    const result = await query(`
      SELECT 
        trial_started_at,
        trial_expires_at,
        trial_status,
        total_cost_usd,
        cost_cap_usd,
        ai_messages_count,
        ai_messages_cost_usd,
        voice_input_minutes,
        voice_input_cost_usd,
        voice_output_chars,
        voice_output_cost_usd,
        calendar_syncs,
        calendar_syncs_cost_usd
      FROM trial_usage
      WHERE user_id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No trial found' });
    }
    
    const usage = result.rows[0];
    
    // Calculate remaining
    const costRemaining = parseFloat(usage.cost_cap_usd) - parseFloat(usage.total_cost_usd);
    const daysRemaining = Math.ceil(
      (new Date(usage.trial_expires_at) - new Date()) / (1000 * 60 * 60 * 24)
    );
    
    const percentUsed = (parseFloat(usage.total_cost_usd) / parseFloat(usage.cost_cap_usd)) * 100;
    
    return res.json({
      status: usage.trial_status,
      usage: {
        total: parseFloat(usage.total_cost_usd).toFixed(2),
        cap: parseFloat(usage.cost_cap_usd).toFixed(2),
        remaining: costRemaining.toFixed(2),
        percentUsed: percentUsed.toFixed(1)
      },
      time: {
        startedAt: usage.trial_started_at,
        expiresAt: usage.trial_expires_at,
        daysRemaining: Math.max(0, daysRemaining)
      },
      breakdown: {
        aiMessages: {
          count: usage.ai_messages_count,
          cost: parseFloat(usage.ai_messages_cost_usd).toFixed(2)
        },
        voiceInput: {
          minutes: usage.voice_input_minutes,
          cost: parseFloat(usage.voice_input_cost_usd).toFixed(2)
        },
        voiceOutput: {
          chars: usage.voice_output_chars,
          cost: parseFloat(usage.voice_output_cost_usd).toFixed(2)
        },
        calendarSyncs: {
          count: usage.calendar_syncs,
          cost: parseFloat(usage.calendar_syncs_cost_usd).toFixed(2)
        }
      }
    });
    
  } catch (error) {
    console.error('ERROR GET /subscriptions/trial-usage:', error);
    return res.status(500).json({ error: 'Failed to fetch trial usage' });
  }
});

module.exports = router;
```

### 3. Integrate Cost Tracking

```javascript
// backend/index.js (update existing endpoints)

const { trackAPICost } = require('./src/middleware/trackCost');

// Example: Track AI message cost
app.post("/test-db", apiLimiter, async (req, res) => {
  // ... existing code ...
  
  const userId = session.session.userId;
  const { message, type } = req.body;
  
  // Track cost for trial users
  await trackAPICost(userId, 'ai_message');
  
  // ... rest of endpoint ...
});

// Example: Track voice input cost
app.post("/voice/transcribe", async (req, res) => {
  // ... existing code ...
  
  const userId = session.userId;
  const audioDuration = req.body.duration; // in seconds
  
  // Track cost
  await trackAPICost(userId, 'voice_input', { durationSeconds: audioDuration });
  
  // ... rest of endpoint ...
});

// Example: Track voice output cost
app.post("/voice/synthesize", async (req, res) => {
  // ... existing code ...
  
  const userId = session.userId;
  const textLength = req.body.text.length;
  
  // Track cost
  await trackAPICost(userId, 'voice_output', { characterCount: textLength });
  
  // ... rest of endpoint ...
});
```

### 4. Cron Job to Expire Trials

```javascript
// backend/scripts/expire-trials.js

const { query } = require('../lib/db');

async function expireTrials() {
  console.log('🔍 Checking for expired trials...');
  
  // Find trials that expired by time
  const timeExpired = await query(`
    UPDATE trial_usage
    SET trial_status = 'expired',
        trial_ended_at = NOW()
    WHERE trial_status = 'active'
      AND trial_expires_at < NOW()
    RETURNING user_id
  `);
  
  console.log(`⏰ Found ${timeExpired.rowCount} time-expired trials`);
  
  // Update user tiers
  for (const row of timeExpired.rows) {
    await query(`
      UPDATE users
      SET subscription_tier = 'free',
          trial_ended_reason = 'time_expired'
      WHERE id = $1
    `, [row.user_id]);
    
    console.log(`Downgraded user ${row.user_id} to free (trial time expired)`);
    
    // TODO: Send email notification
  }
  
  console.log('✅ Trial expiration check complete');
}

expireTrials()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
```

---

## iOS Implementation

I'll create the iOS implementation files in the next message due to length. They will include:

1. Updated `SubscriptionManager.swift` with trial tier
2. `TrialUsageMeter.swift` - Real-time usage display
3. `TrialActivationView.swift` - Onboarding to trial
4. `TrialExpiredView.swift` - Upgrade prompt

Shall I continue with the iOS implementation?
