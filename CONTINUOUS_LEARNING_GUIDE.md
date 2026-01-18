# Continuous Learning System

**Automated AI improvement from user interactions and feedback loops**

---

## Overview

The continuous learning system creates a self-improving AI that gets better over time without manual intervention. It combines:

1. **User Feedback** (👍/👎 buttons)
2. **Automated Analysis** (every 30 minutes)
3. **Training Data Generation** (from positive examples)
4. **Model Fine-Tuning** (when ready)
5. **Deployment** (improved model goes live)
6. **Monitoring** (tracks improvement over time)

## The Learning Loop

```
Users Interact → AI Responds → Users Rate Response → 
System Analyzes → Identifies Patterns → Generates Training Data →
Fine-Tunes Model → Deploys Improved Model → Users Interact (repeat!)
```

---

## Architecture

### Components

**1. Feedback Collection** (`ChatInput.tsx`)
- 👍/👎 buttons on every AI response
- Stores: user message, AI response, action taken, rating

**2. Continuous Learning Pipeline** (`continuous-learning-pipeline.js`)
- Runs every 30 minutes
- Analyzes recent feedback
- Identifies problem areas
- Generates training data when ready
- Queues fine-tuning jobs

**3. Learning Dashboard** (`/api/admin/learning-dashboard`)
- Real-time metrics
- Approval rates by action type
- Trending over time
- Common failure patterns

**4. Training Snapshots** (`training-snapshots/`)
- JSONL files with positive examples
- Versioned by date
- Ready for fine-tuning

---

## Setup

### 1. Run Setup Script

```bash
cd backend
chmod +x scripts/setup-continuous-learning.sh
./scripts/setup-continuous-learning.sh
```

This will:
- Create necessary directories
- Run database migrations
- Test the pipeline
- Show cron setup instructions

### 2. Configure Railway Cron Job

**In Railway Dashboard:**

1. Click "New" → "Cron Job"
2. Name: `helpem-learning-pipeline`
3. Schedule: `*/30 * * * *` (every 30 minutes)
4. Command: `node backend/scripts/continuous-learning-pipeline.js`
5. Environment Variables:
   ```
   DATABASE_URL=<copy from main service>
   ENABLE_AUTO_FINETUNE=false
   OPENAI_API_KEY=<your key>
   ```

6. Deploy!

### 3. Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
DATABASE_PUBLIC_URL=postgresql://...

# Optional (for auto fine-tuning)
ENABLE_AUTO_FINETUNE=false  # Set to 'true' when ready
OPENAI_API_KEY=sk-...       # For fine-tuning API calls
```

---

## How It Works

### Every 30 Minutes:

#### Step 1: Analyze Feedback
```
📊 Total feedback: 1,247
   👍 Thumbs up: 1,089 (87.3%)
   👎 Thumbs down: 158 (12.7%)
   
By Action Type:
- todo: 520 (91% approval)
- appointment: 312 (89% approval)
- grocery: 215 (85% approval)
- routine: 200 (82% approval) ⚠️
```

#### Step 2: Identify Issues
```
⚠️  Issues Detected:
  - routine approval rate 82% is below threshold
  - Found 3 repeated failure patterns
```

#### Step 3: Check Training Readiness
```
✅ Sufficient feedback (1,247 >= 500)
📝 Generated 1,089 training examples
💾 Saved: training-snapshot-2026-01-18.jsonl
```

#### Step 4: Queue Fine-Tuning (if enabled)
```
🚀 Queuing fine-tuning job...
📋 Model: gpt-3.5-turbo
📦 Training examples: 1,089
⏱️  Estimated time: 10-15 minutes
```

#### Step 5: Deploy Improved Model
```
✅ Fine-tuning complete: ft:gpt-3.5-turbo:helpem:v2
🚀 Deploying to production...
📈 Expected improvement: +5-8% approval rate
```

---

## Metrics & Monitoring

### Learning Dashboard

**Access:**
```bash
curl https://app.helpem.ai/api/admin/learning-dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "current": {
    "total_feedback": 1247,
    "thumbs_up": 1089,
    "thumbs_down": 158,
    "approval_rate": 87.3
  },
  "trend": [
    {"date": "2026-01-11", "feedback_count": 89, "approval_rate": 84.3},
    {"date": "2026-01-12", "feedback_count": 124, "approval_rate": 86.2},
    {"date": "2026-01-18", "feedback_count": 203, "approval_rate": 89.1}
  ],
  "by_action": [
    {"action_type": "todo", "count": 520, "approval_rate": 91.0},
    {"action_type": "appointment", "count": 312, "approval_rate": 89.0}
  ],
  "learning_status": {
    "ready_for_training": true,
    "feedback_count": 1247,
    "needed_for_training": 0,
    "approval_rate": 87.3,
    "health": "excellent"
  }
}
```

### Health Status

- **Excellent**: 85%+ approval rate
- **Good**: 75-85% approval rate
- **Needs Improvement**: <75% approval rate

### Training Readiness

- **Not Ready**: <500 feedback items
- **Ready**: 500+ feedback items
- **Optimal**: 1000+ feedback items

---

## Fine-Tuning Integration

### Manual Fine-Tuning (Development)

```bash
# 1. Export training data
node backend/scripts/export-feedback-training-data.js > training.jsonl

# 2. Upload to OpenAI
openai api fine_tunes.create \
  -t training.jsonl \
  -m gpt-3.5-turbo \
  --suffix "helpem-v1"

# 3. Monitor progress
openai api fine_tunes.follow -i ft-abc123

# 4. Update model in code
# Edit web/src/app/api/chat/route.ts:
# model: "ft:gpt-3.5-turbo:helpem:v1:abc123"
```

### Automated Fine-Tuning (Production)

Set `ENABLE_AUTO_FINETUNE=true` in environment variables.

The pipeline will:
1. Check if 500+ new feedback items since last training
2. Generate training snapshot
3. Call OpenAI API to create fine-tuning job
4. Monitor job progress
5. Update model version when complete
6. Deploy new model automatically

---

## Continuous Improvement Cycle

### Week 1: Data Collection
```
Day 1: 50 feedback items (10% of target)
Day 3: 150 feedback items (30% of target)
Day 7: 500 feedback items ✅ Ready for training!
```

### Week 2: First Fine-Tune
```
Generate 450 positive training examples
Fine-tune GPT-3.5-turbo
Deploy improved model
Approval rate: 80% → 85% 🎉
```

### Week 3: Continued Learning
```
Collect 800 more feedback items
Identify: routine creation needs improvement
Fine-tune with focus on routines
Approval rate: 85% → 88% 🎉
```

### Week 4: Optimization
```
Collect 1,200 more feedback items
System automatically fine-tunes
Approval rate: 88% → 90% 🎉
Model: helpem-v4
```

---

## Best Practices

### DO ✅

- **Start conservatively**: ENABLE_AUTO_FINETUNE=false initially
- **Monitor first**: Watch dashboard for a week
- **Manual first**: Run 2-3 manual fine-tunes before automation
- **Track versions**: Name models with versions (v1, v2, v3)
- **A/B test**: Compare old vs new model performance
- **Set alerts**: Email if approval rate drops

### DON'T ❌

- **Don't over-train**: Wait for 500+ new examples between fine-tunes
- **Don't ignore warnings**: Low approval rates need investigation
- **Don't auto-deploy**: Test new models in staging first
- **Don't forget costs**: Fine-tuning costs ~$0.008/1K tokens
- **Don't lose data**: Back up training snapshots

---

## Costs

### Feedback Storage
- **Database**: ~1MB per 10,000 feedback items
- **Cost**: Negligible on Railway/Postgres

### Fine-Tuning (OpenAI)
- **Training**: ~$0.008 per 1K tokens
- **Usage**: ~$0.012 per 1K tokens (vs $0.002 base)
- **1,000 examples**: ~$2-5 per fine-tune
- **Monthly** (4 fine-tunes): ~$10-20

### ROI
- **Better AI** = Better user experience
- **Better UX** = More users = More revenue
- **Investment**: $20/month
- **Return**: Improved conversion, retention, satisfaction

---

## Troubleshooting

### Pipeline Not Running

```bash
# Check Railway logs
railway logs -s helpem-learning-pipeline

# Run manually
node backend/scripts/continuous-learning-pipeline.js

# Check cron schedule
echo "*/30 * * * *" # Every 30 minutes
```

### Low Approval Rate

1. Check dashboard for patterns
2. Review common failures
3. Investigate specific action types
4. Consider prompt adjustments
5. May need human review of edge cases

### Fine-Tuning Fails

```bash
# Check OpenAI API key
echo $OPENAI_API_KEY

# Verify training data format
head -n 1 training-snapshot-2026-01-18.jsonl | jq .

# Check OpenAI status
curl https://status.openai.com/api/v2/status.json
```

---

## Roadmap

### Phase 1: Manual Learning ✅
- User feedback collection
- Manual analysis
- Manual fine-tuning

### Phase 2: Semi-Automated ✅ (Current)
- Automated analysis
- Automated data generation
- Manual fine-tuning
- Manual deployment

### Phase 3: Fully Automated (Next)
- Automated fine-tuning
- Automated testing
- Automated deployment
- Continuous monitoring

### Phase 4: Advanced Learning (Future)
- Reinforcement learning
- Multi-model ensemble
- Real-time adaptation
- Personalized models per user

---

## Success Metrics

### Short-Term (1 month)
- ✅ 500+ feedback items collected
- ✅ First fine-tune completed
- ✅ 5%+ improvement in approval rate

### Mid-Term (3 months)
- ✅ 5,000+ feedback items
- ✅ 3+ fine-tuning iterations
- ✅ 10%+ improvement overall
- ✅ 90%+ approval on main actions

### Long-Term (6+ months)
- ✅ Fully automated pipeline
- ✅ Continuous improvement
- ✅ 95%+ approval rate
- ✅ User-specific adaptations

---

## Support

**Questions?** Check:
1. Pipeline logs: `railway logs -s helpem-learning-pipeline`
2. Dashboard: `https://app.helpem.ai/api/admin/learning-dashboard`
3. Training snapshots: `backend/training-snapshots/`
4. This guide!

**Ready to build a self-improving AI!** 🚀
