#!/bin/bash
# Fix failed migration 009 on Railway

echo "🔧 Fixing failed migration on Railway database..."

# Get DATABASE_URL from Railway
DATABASE_URL=$(railway variables get DATABASE_URL 2>/dev/null)

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Could not get DATABASE_URL from Railway"
  exit 1
fi

echo "✅ Got DATABASE_URL"

# Mark migration 009 as rolled back so it can be reapplied
echo "📝 Marking migration 009 as rolled back..."
psql "$DATABASE_URL" << 'EOF'
-- Mark the failed migration as rolled back
UPDATE "_prisma_migrations"
SET rolled_back_at = NOW(),
    finished_at = NOW()
WHERE migration_name = '009_add_activity_hidden_state'
  AND finished_at IS NULL;
EOF

echo "✅ Migration marked as resolved"
echo ""
echo "Now run: railway redeploy --service api --yes"
echo "The migration will be reapplied on next deploy"
