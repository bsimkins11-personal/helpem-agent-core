#!/bin/bash

echo "🔍 Testing database connection..."
echo ""

# Load DATABASE_URL from backend/.env if it exists and DATABASE_URL is not already set
if [ -z "$DATABASE_URL" ] && [ -f "backend/.env" ]; then
  echo "📁 Loading DATABASE_URL from backend/.env..."
  set -a
  source backend/.env
  set +a
  echo ""
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not set"
  echo ""
  echo "Please add DATABASE_URL to backend/.env file"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Run the Node.js test script
DATABASE_URL="$DATABASE_URL" node test-seed-connection.js
