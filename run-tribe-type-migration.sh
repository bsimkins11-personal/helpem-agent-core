#!/bin/bash
set -e

echo "Running tribe type migration on Railway..."

# This will be run automatically by Railway on next deploy
# Or you can run manually with:
# railway run bash -c "psql \$DATABASE_URL < backend/migrations/add_tribe_type.sql"

echo "Migration file created at: backend/migrations/add_tribe_type.sql"
echo "This will be applied when the backend deploys to Railway"
