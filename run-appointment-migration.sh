#!/bin/bash
# Script to add topic and location columns to appointments table

echo "🚀 Running appointment optional fields migration..."
echo ""

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  echo "Run: railway variables --service api"
  echo "Then: export DATABASE_URL=<your_url>"
  exit 1
fi

echo "📊 Adding topic and location columns..."
psql "$DATABASE_URL" -f migrations/add_appointment_optional_fields.sql

echo ""
echo "✅ Migration complete!"
echo "✅ Appointments table now has: topic, location"
