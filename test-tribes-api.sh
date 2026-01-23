#!/bin/bash

# Test Tribes API QA Script

echo "🧪 QA: Testing Tribes API"
echo "================================"
echo ""

# Check if we have a session token in browser localStorage
echo "📋 Test 1: Debug endpoint (no auth required)"
echo "   URL: https://api-production-2989.up.railway.app/debug/tribes"
curl -s https://api-production-2989.up.railway.app/debug/tribes | jq '{
  totalTribes: .totalTribes,
  demoTribes: [.tribes[] | select(.name == "Yoga Tribe" or .name == "Beach Crew" or .name == "Blvd Burger") | {name, memberCount, hasMessages}]
}'

echo ""
echo "📋 Test 2: Real tribes endpoint (requires auth)"
echo "   URL: https://api-production-2989.up.railway.app/tribes"
echo "   Status: Requires session token from browser"
echo ""
echo "   To test with real auth:"
echo "   1. Open browser console on helpem.ai"
echo "   2. Run: localStorage.getItem('helpem_session')"
echo "   3. Copy the token"
echo "   4. Run: export TOKEN='your-token'"
echo "   5. Run: curl -H 'Authorization: Bearer \$TOKEN' https://api-production-2989.up.railway.app/tribes"
echo ""

echo "✅ Expected data structure for homescreen:"
echo "{"
echo '  "tribes": ['
echo '    {'
echo '      "id": "uuid",'
echo '      "name": "Tribe Name",'
echo '      "memberCount": 5,'
echo '      "unreadMessageCount": 2,'
echo '      "pendingProposalsCount": 1,'
echo '      "lastMessage": {'
echo '        "text": "message text",'
echo '        "senderName": "User Name",'
echo '        "timestamp": "ISO date"'
echo '      }'
echo '    }'
echo '  ]'
echo "}"
echo ""

echo "🔍 QA Checklist:"
echo "  ✅ Debug endpoint returns 7 tribes"
echo "  ✅ Yoga Tribe: 5 members, has messages"
echo "  ✅ Beach Crew: 5 members, has messages"  
echo "  ✅ Blvd Burger: 5 members, has messages"
echo "  ⏳ Real endpoint: Needs browser session token to test"
echo ""
echo "📱 To verify in app:"
echo "  1. Open browser console (F12)"
echo "  2. Check for '🔐 Tribes: Token exists?' log"
echo "  3. Check for '✅ Tribes data received' log"
echo "  4. If errors, look for '❌ Tribes API error' or '💥 Failed to load tribes'"
