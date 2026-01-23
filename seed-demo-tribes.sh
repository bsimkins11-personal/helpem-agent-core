#!/bin/bash

echo "🌱 Demo Tribes Seeder"
echo "===================="
echo ""

# Check if user provided their user ID
if [ -z "$1" ]; then
  echo "❌ Error: User ID required"
  echo ""
  echo "Usage: ./seed-demo-tribes.sh YOUR_USER_ID"
  echo ""
  echo "To find your user ID:"
  echo "  Option 1: Check iOS app logs after sign in"
  echo "  Option 2: Run this query:"
  echo "    psql \$DATABASE_URL -c \"SELECT id, apple_user_id FROM users ORDER BY last_active_at DESC LIMIT 5;\""
  echo ""
  exit 1
fi

USER_ID="$1"

echo "🔍 User ID: $USER_ID"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable not set"
  echo "Please set DATABASE_URL to your PostgreSQL connection string"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Verify user exists
echo "🔍 Verifying user exists..."
USER_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE id = '$USER_ID';")

if [ "$USER_CHECK" -eq "0" ]; then
  echo "❌ Error: User not found with ID: $USER_ID"
  echo ""
  echo "Available users:"
  psql "$DATABASE_URL" -c "SELECT id, apple_user_id, created_at FROM users ORDER BY last_active_at DESC LIMIT 5;"
  exit 1
fi

echo "✅ User found"
echo ""

# Run seed script
echo "🌱 Creating demo tribes..."
echo ""

cd "$(dirname "$0")" && node backend/scripts/seed-demo-tribes.js "$USER_ID"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Success! Demo tribes created."
  echo ""
  echo "📱 Next steps:"
  echo "  1. Open your HelpEm app"
  echo "  2. Go to menu → Tribes"
  echo "  3. You should see 3 new tribes:"
  echo "     - Yoga Tribe"
  echo "     - Beach Crew"
  echo "     - Blvd Burger"
  echo ""
  echo "💬 Each tribe has realistic messages and proposals!"
else
  echo ""
  echo "❌ Failed to create demo tribes"
  echo "Check the error messages above"
fi

exit $EXIT_CODE
