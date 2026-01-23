#!/bin/bash
set -e

echo "🔄 Running trial with usage cap migration..."
echo ""
echo "This migration adds:"
echo "  - subscription_tier column to users table"
echo "  - trial_usage table for $5 usage tracking"
echo "  - Functions for trial validation"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo "Please set DATABASE_URL to your PostgreSQL connection string"
  exit 1
fi

echo "📊 Applying migration: 008_trial_with_usage_cap.sql"
psql "$DATABASE_URL" < migrations/008_trial_with_usage_cap.sql

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "📝 Summary of changes:"
echo "   - Added subscription_tier column to users"
echo "   - Created trial_usage table"
echo "   - Added indices for performance"
echo "   - Created helper functions for trial validation"
echo ""
echo "🔧 Next steps:"
echo "   1. Deploy backend with cost tracking middleware"
echo "   2. Add trial activation endpoint"
echo "   3. Deploy iOS app with trial UI"
echo "   4. Set up cron job to expire trials"
echo ""
echo "🧪 Test trial activation:"
echo "   curl -X POST https://api.helpem.ai/subscriptions/start-trial \\"
echo "     -H 'Authorization: Bearer {token}'"
