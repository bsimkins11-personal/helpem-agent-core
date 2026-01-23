#!/bin/bash
# Clean up old demo tribes via Railway database

echo "🧹 Cleaning up old demo tribes via SQL..."

# Get DATABASE_URL from .env
source .env

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  exit 1
fi

echo "Connecting to database..."

# Soft-delete old demo tribes
psql "$DATABASE_URL" <<EOF
-- Soft delete old demo tribes
UPDATE tribes 
SET deleted_at = NOW() 
WHERE name IN ('Yoga Tribe', 'Beach Crew', 'Blvd Burger', 'Test tribe', 'Norayne')
  AND deleted_at IS NULL;

-- Show remaining tribes
SELECT id, name, created_at, deleted_at 
FROM tribes 
WHERE deleted_at IS NULL
ORDER BY created_at DESC;
EOF

echo ""
echo "✅ Old demo tribes cleaned up!"
echo "🎬 User will now get new demo tribes: 🏠 My Family, 💼 Work Team, 🏘️ Roommates"
