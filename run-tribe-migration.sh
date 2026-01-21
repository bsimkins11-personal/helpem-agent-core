#!/bin/bash

# Tribe Migration Script
# Adds Tribe tables to the database

set -e

echo "🔄 Running Tribe migration..."

# Navigate to backend directory
cd backend

# Run Prisma migration
npx prisma migrate dev --name add_tribe_system

echo "✅ Tribe migration complete!"

# Generate Prisma client
npx prisma generate

echo "✅ Prisma client regenerated"

# Verify migration
npx prisma migrate status

echo ""
echo "🎉 Tribe system is ready!"
echo ""
echo "Next steps:"
echo "1. Update your iOS Xcode project to include new Tribe files"
echo "2. Add 'My Tribe' menu item to your main navigation"
echo "3. Test the Tribe invitation and proposal flow"
echo "4. Configure push notifications for Tribe proposals"
