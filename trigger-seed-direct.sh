#!/bin/bash

echo "🎬 Manually triggering demo tribes seed..."
echo ""

# You need to get a real session token from your device
# For now, let's create the tribes directly via SQL

source web/.env

echo "Creating synthetic users..."
psql "$DATABASE_URL" <<EOF
INSERT INTO users (apple_user_id, last_active_at) 
VALUES 
  ('demo-sarah-spouse-001', NOW()),
  ('demo-mom-family-001', NOW()),
  ('demo-alex-kid-001', NOW()),
  ('demo-jordan-manager-001', NOW()),
  ('demo-casey-teammate-001', NOW()),
  ('demo-morgan-designer-001', NOW()),
  ('demo-taylor-roommate-001', NOW()),
  ('demo-jamie-roommate-002', NOW()),
  ('demo-chris-roommate-003', NOW())
ON CONFLICT (apple_user_id) DO UPDATE SET last_active_at = NOW();
EOF

echo ""
echo "✅ Synthetic users created"
echo ""

# Call the backend directly
echo "Calling backend seed endpoint..."
echo "(This requires authentication - testing if it works)"
echo ""

curl -s -X POST "https://api-production-2989.up.railway.app/tribes/demo/seed" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_token" 2>&1 | head -20

echo ""
echo ""
echo "Note: If you see 'Invalid session token', that's expected."
echo "The tribes will be auto-created when you open the app with a valid login."
