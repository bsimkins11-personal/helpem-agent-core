#!/bin/bash
# Apply all pending migrations to Railway database

set -e

echo "Applying migrations to Railway..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  echo "Run: railway run bash backend/scripts/apply-migrations.sh"
  exit 1
fi

# Apply each migration in order
for migration in backend/migrations/*.sql; do
  echo "Applying: $migration"
  psql "$DATABASE_URL" < "$migration"
  echo "✅ Applied: $migration"
done

echo "✅ All migrations applied successfully"
