# RLHF Feedback System Guide

**Reinforcement Learning from Human Feedback (RLHF)** - User feedback system for continuous AI improvement

---

## Overview

The feedback system allows users to rate AI responses with 👍 or 👎, creating training data for model fine-tuning. As more users provide feedback, the AI learns from real-world usage and improves over time - this is the **network effect**.

## Features

### ✅ User Experience
- **Thumbs up/down buttons** appear next to every AI response
- **Visual feedback**: Selected button is highlighted
- **Instant response**: Updates immediately, syncs to server
- **Non-intrusive**: Small buttons that don't clutter the chat

### ✅ Data Collection
- Tracks user message (prompt)
- Tracks AI response (completion)
- Tracks action taken (todo, appointment, etc.)
- Tracks full action context (JSON)
- Links to user ID for segmentation

### ✅ Analytics
- **Approval rate** by action type
- **Positive/negative** example counts
- **Trending** improvements over time
- **Export** for model training

---

## Setup

### 1. Run Database Migration

```bash
# From project root
cd backend
node scripts/run-feedback-migration.js
```

This creates the `feedback` table with:
- user_id
- message_id
- feedback (up/down)
- user_message (original prompt)
- assistant_response
- action_type
- action_data (full JSON)
- timestamps and indexes

### 2. Deploy Web Changes

```bash
# Web changes auto-deploy via Vercel
git push origin main
```

### 3. Test Feedback

1. Open app
2. Ask AI to do something: "Add milk to my list"
3. Click 👍 or 👎 on the response
4. Check backend logs for confirmation

---

## Usage

### For Users

**Good Response** 👍
- AI understood correctly
- Did the right action
- Response was helpful

**Bad Response** 👎
- AI misunderstood
- Did the wrong action
- Response was confusing

### For Developers

#### View Feedback Summary

```bash
curl https://app.helpem.ai/api/feedback?type=summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "summary": [
    {
      "action_type": "todo",
      "total_feedback": 150,
      "thumbs_up": 135,
      "thumbs_down": 15,
      "approval_rate": 90.0
    },
    {
      "action_type": "appointment",
      "total_feedback": 80,
      "thumbs_up": 75,
      "thumbs_down": 5,
      "approval_rate": 93.8
    }
  ]
}
```

#### View Recent Feedback

```bash
curl https://app.helpem.ai/api/feedback \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Export Training Data

```bash
# Export positive examples to JSONL
cd backend
node scripts/export-feedback-training-data.js > training-data.jsonl
```

Output format (OpenAI fine-tuning compatible):
```json
{"messages":[{"role":"user","content":"Add milk to my list"},{"role":"assistant","content":"Added 'Buy milk' to your todos."}],"metadata":{"feedback":"up","action_type":"todo"}}
{"messages":[{"role":"user","content":"Remind me to call mom at 3pm"},{"role":"assistant","content":"I'll remind you to call mom at 3 PM today."}],"metadata":{"feedback":"up","action_type":"todo"}}
```

---

## Fine-Tuning Workflow

### 1. Collect Feedback
- Users use the app
- Click thumbs up/down
- Data accumulates

### 2. Export Training Data
```bash
node backend/scripts/export-feedback-training-data.js > training-$(date +%Y%m%d).jsonl
```

### 3. Prepare for OpenAI
```bash
# Count examples
wc -l training-20260118.jsonl

# Preview examples
head -n 5 training-20260118.jsonl | jq .
```

### 4. Upload to OpenAI

```bash
# Using OpenAI CLI
openai api fine_tunes.create \
  -t training-20260118.jsonl \
  -m gpt-3.5-turbo \
  --suffix "helpem-v1"
```

Or use the OpenAI dashboard:
1. Go to https://platform.openai.com/finetune
2. Upload `training-20260118.jsonl`
3. Select base model
4. Start fine-tuning job

### 5. Deploy Fine-Tuned Model

```javascript
// Update in web/src/app/api/chat/route.ts
const completion = await openai.chat.completions.create({
  model: "ft:gpt-3.5-turbo:helpem:v1:abc123", // Your fine-tuned model
  messages: messages,
});
```

---

## Network Effect

### Growth Cycle

1. **More Users** → More conversations
2. **More Conversations** → More feedback
3. **More Feedback** → Better training data
4. **Better Training Data** → Improved model
5. **Improved Model** → Better user experience
6. **Better Experience** → More users (repeat)

### Milestones

| Users | Expected Feedback | Impact |
|-------|-------------------|--------|
| 10 | ~50/week | Initial patterns |
| 100 | ~500/week | Clear trends |
| 1,000 | ~5,000/week | First fine-tune |
| 10,000 | ~50,000/week | Major improvements |

---

## Analytics Queries

### Best Performing Actions
```sql
SELECT 
  action_type,
  COUNT(*) as total,
  ROUND(AVG(CASE WHEN feedback = 'up' THEN 100.0 ELSE 0 END), 1) as approval_rate
FROM feedback
GROUP BY action_type
ORDER BY approval_rate DESC;
```

### Trending Over Time
```sql
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_feedback,
  COUNT(CASE WHEN feedback = 'up' THEN 1 END) as positive
FROM feedback
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY date
ORDER BY date;
```

### Common Failure Patterns
```sql
SELECT 
  user_message,
  assistant_response,
  action_type,
  COUNT(*) as frequency
FROM feedback
WHERE feedback = 'down'
GROUP BY user_message, assistant_response, action_type
HAVING COUNT(*) > 2
ORDER BY frequency DESC
LIMIT 20;
```

---

## Privacy & Ethics

### Data Protection
✅ User ID is hashed/anonymized
✅ No personally identifiable information stored
✅ Feedback is opt-in (users choose to click)
✅ Can be disabled per user if needed

### Best Practices
- Don't penalize users for negative feedback
- Use negative feedback to identify bugs
- Focus on aggregate patterns, not individuals
- Regularly review and act on feedback

---

## Monitoring

### Key Metrics

**Daily:**
- Total feedback count
- Thumbs up/down ratio
- Feedback by action type

**Weekly:**
- Trending approval rates
- New failure patterns
- User engagement

**Monthly:**
- Export training data
- Run fine-tuning job
- Deploy improved model

### Alerts

Set up alerts for:
- Approval rate drops below 80%
- New action type getting many 👎
- Sudden spike in negative feedback

---

## Troubleshooting

### No Feedback Showing
- Check browser console for errors
- Verify `/api/feedback` endpoint is accessible
- Check user authentication

### Feedback Not Saving
- Check backend logs
- Verify database connection
- Ensure `feedback` table exists

### Export Has No Data
- Check database has feedback rows
- Verify DATABASE_URL is set
- Run SQL query directly to confirm data

---

## Roadmap

### Phase 1: Basic Feedback ✅
- Thumbs up/down UI
- Database storage
- Basic analytics

### Phase 2: Enhanced Analytics (Next)
- Real-time dashboard
- A/B testing different prompts
- Automatic issue detection

### Phase 3: Auto-Improvement (Future)
- Scheduled fine-tuning jobs
- Automatic model deployment
- Continuous learning loop

---

## Questions?

**Q: When should I run my first fine-tune?**
A: After collecting ~500-1000 positive examples (thumbs up).

**Q: How much does fine-tuning cost?**
A: ~$0.008 per 1K tokens. A 1000-example dataset costs ~$2-5.

**Q: How often should I fine-tune?**
A: Start monthly, then adjust based on feedback volume.

**Q: Can I use this with other AI providers?**
A: Yes! The JSONL format works with most providers (OpenAI, Anthropic, etc.).

---

**Ready to improve your AI with real user feedback!** 🚀
