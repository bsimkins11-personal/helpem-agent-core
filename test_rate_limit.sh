#!/bin/bash

# Test Rate Limiting on Support API
# This script will hit the rate limit and demonstrate protection

echo "🛡️ Testing HelpEm API Rate Limiting"
echo "===================================="
echo ""
echo "Target: /api/support"
echo "Limit: 20 requests per 15 minutes"
echo ""
echo "Sending 25 requests to trigger rate limit..."
echo ""

SUCCESS=0
RATE_LIMITED=0

for i in {1..25}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    https://helpem-poc.vercel.app/api/support \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}')
  
  STATUS=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$STATUS" = "200" ]; then
    SUCCESS=$((SUCCESS + 1))
    echo "✅ Request $i: SUCCESS (200)"
  elif [ "$STATUS" = "429" ]; then
    RATE_LIMITED=$((RATE_LIMITED + 1))
    echo "🛑 Request $i: RATE LIMITED (429)"
    
    # Extract rate limit info from first rate limited response
    if [ $RATE_LIMITED -eq 1 ]; then
      BODY=$(echo "$RESPONSE" | head -n-1)
      echo ""
      echo "📋 Rate Limit Response:"
      echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
      echo ""
    fi
  else
    echo "❓ Request $i: Unknown status ($STATUS)"
  fi
  
  sleep 0.5
done

echo ""
echo "===================================="
echo "📊 Results:"
echo "   Successful: $SUCCESS"
echo "   Rate Limited: $RATE_LIMITED"
echo ""

if [ $RATE_LIMITED -gt 0 ]; then
  echo "✅ Rate limiting is WORKING!"
  echo "   Your API is protected from abuse."
else
  echo "⚠️  No rate limiting detected."
  echo "   This might indicate an issue."
fi

echo ""
echo "💡 To test again, wait 15 minutes for rate limit to reset."
