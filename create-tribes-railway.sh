#!/bin/bash

echo "🌱 Create Demo Tribes in Railway Database"
echo "=========================================="
echo ""

# Check if user provided their user ID
if [ -z "$1" ]; then
  echo "❌ Error: User ID required"
  echo ""
  echo "Usage: ./create-tribes-railway.sh YOUR_USER_ID"
  echo ""
  echo "First, find your user ID by checking the Railway database:"
  echo "  1. Go to Railway → Your Project → Postgres"
  echo "  2. Click 'Query' tab"
  echo "  3. Run: SELECT id, apple_user_id FROM users ORDER BY last_active_at DESC LIMIT 5;"
  echo "  4. Copy your user ID (the UUID)"
  echo ""
  exit 1
fi

USER_ID="$1"

echo "🔍 User ID: $USER_ID"
echo ""

# Pull latest environment variables from Vercel (includes Railway DATABASE_URL)
echo "📥 Pulling DATABASE_URL from Vercel..."
vercel env pull --yes > /dev/null 2>&1

if [ ! -f ".env.local" ]; then
  echo "❌ Error: Failed to pull environment variables"
  echo ""
  echo "Please run manually:"
  echo "  vercel env pull"
  exit 1
fi

# Load DATABASE_URL from .env.local
set -a
source .env.local
set +a

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not found in .env.local"
  echo ""
  echo "Please set it manually:"
  echo "  export DATABASE_URL='your-railway-postgres-url'"
  exit 1
fi

echo "✅ DATABASE_URL loaded from Vercel"
echo ""

# Verify user exists in Railway database
echo "🔍 Verifying user exists in Railway database..."
USER_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE id = '$USER_ID';" 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Error: Could not connect to Railway database"
  echo "$USER_CHECK"
  exit 1
fi

USER_COUNT=$(echo "$USER_CHECK" | tr -d ' ')

if [ "$USER_COUNT" = "0" ]; then
  echo "❌ Error: User not found with ID: $USER_ID"
  echo ""
  echo "Available users in Railway:"
  psql "$DATABASE_URL" -c "SELECT id, apple_user_id, created_at FROM users ORDER BY last_active_at DESC LIMIT 5;"
  exit 1
fi

echo "✅ User found in Railway database"
echo ""

# Generate Prisma client
echo "🔧 Generating Prisma client..."
cd backend && npx prisma generate > /dev/null 2>&1
cd ..

# Run seed script
echo "🌱 Creating demo tribes in Railway..."
echo ""

DATABASE_URL="$DATABASE_URL" node backend/scripts/seed-demo-tribes.js "$USER_ID"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Success! Demo tribes created in Railway!"
  echo ""
  echo "📱 Open your app and refresh to see:"
  echo "  - 🧘‍♀️ Yoga Tribe"
  echo "  - 🏄‍♂️ Beach Crew"
  echo "  - 🍔 Blvd Burger"
  echo ""
else
  echo ""
  echo "❌ Failed to create demo tribes"
  echo "Check the error messages above"
fi

exit $EXIT_CODE
