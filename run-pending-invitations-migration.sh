#!/bin/bash
set -e

echo "🔄 Running pending tribe invitations migration..."
echo ""
echo "This migration adds support for inviting contacts to tribes."
echo "When a contact is invited but not yet a HelpEm user,"
echo "the invitation is stored and auto-accepted when they sign up."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo "Please set DATABASE_URL to your PostgreSQL connection string"
  exit 1
fi

echo "📊 Applying migration: 007_pending_tribe_invitations.sql"
psql "$DATABASE_URL" < migrations/007_pending_tribe_invitations.sql

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "📝 Summary of changes:"
echo "   - Added pending_tribe_invitations table"
echo "   - Added indices for efficient lookup"
echo "   - Auto-expire invitations after 30 days"
echo ""
echo "🔧 Next steps:"
echo "   1. Deploy backend changes with new /tribes/:tribeId/invite-contact endpoint"
echo "   2. Deploy iOS app with contact picker integration"
echo "   3. Test invite flow end-to-end"
