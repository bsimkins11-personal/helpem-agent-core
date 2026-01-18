#!/bin/bash
# Setup Continuous Learning System
# Configures automated AI improvement pipeline

set -e

echo "🤖 Setting up Continuous Learning System..."
echo ""

# Step 1: Create training snapshots directory
echo "📁 Creating training snapshots directory..."
mkdir -p backend/training-snapshots
echo "✅ Directory created"
echo ""

# Step 2: Run database migrations
echo "📊 Running database migrations..."
node backend/scripts/run-feedback-migration.js
echo ""

# Step 3: Setup cron job (Railway)
echo "⏰ Cron Job Setup Instructions:"
echo ""
echo "Option 1: Railway Cron Service (Recommended)"
echo "  1. In Railway dashboard, add new service"
echo "  2. Select 'Cron Job'"
echo "  3. Set schedule: */30 * * * * (every 30 minutes)"
echo "  4. Set command: node backend/scripts/continuous-learning-pipeline.js"
echo "  5. Add environment variables:"
echo "     - DATABASE_URL (same as main service)"
echo "     - ENABLE_AUTO_FINETUNE=false (set to true when ready)"
echo "     - OPENAI_API_KEY (for fine-tuning)"
echo ""
echo "Option 2: Local Cron (Development)"
echo "  Add to crontab:"
echo "  */30 * * * * cd /path/to/project && node backend/scripts/continuous-learning-pipeline.js"
echo ""

# Step 4: Test the pipeline
echo "🧪 Testing pipeline (dry run)..."
echo ""
node backend/scripts/continuous-learning-pipeline.js
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Collect user feedback (users click 👍/👎)"
echo "  2. Pipeline runs every 30 minutes"
echo "  3. After 500+ feedback items, ready for training"
echo "  4. Enable auto fine-tuning: ENABLE_AUTO_FINETUNE=true"
echo ""
echo "Monitor dashboard: https://app.helpem.ai/api/admin/learning-dashboard"
echo ""
