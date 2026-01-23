#!/bin/bash

echo "🔍 Finding your user ID..."
echo ""

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not set"
  echo ""
  echo "Please set DATABASE_URL:"
  echo "  export DATABASE_URL='your-postgres-connection-string'"
  echo ""
  exit 1
fi

echo "Recent users:"
echo "============="
psql "$DATABASE_URL" -c "SELECT id, apple_user_id, last_active_at FROM users ORDER BY last_active_at DESC LIMIT 10;"

echo ""
echo "💡 Copy the UUID from the 'id' column for your user"
echo "   Then run: ./seed-demo-tribes.sh <YOUR_USER_ID>"
