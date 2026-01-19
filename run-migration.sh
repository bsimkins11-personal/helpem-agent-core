#!/bin/bash
# Script to run feedback table migration on Railway

echo "🚀 Running feedback table migration on Railway..."
echo ""

cd backend

# Use Railway to execute the migration
railway run --service api node scripts/create-feedback-table.js

echo ""
echo "✅ Migration complete!"
