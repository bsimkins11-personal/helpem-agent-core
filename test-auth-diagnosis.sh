#!/bin/bash

echo "🔍 DIAGNOSING AUTHENTICATION ERROR"
echo "=================================="
echo ""

echo "Test 1: Check /api/chat without auth"
echo "-------------------------------------"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST https://helpem.ai/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Buy milk", "userData": {"todos": [], "appointments": [], "habits": []}, "conversationHistory": []}')

echo "$response"
echo ""

if echo "$response" | grep -q "HTTP_CODE:401"; then
  echo "❌ 401 Unauthorized - Authentication required"
elif echo "$response" | grep -q "HTTP_CODE:403"; then
  echo "❌ 403 Forbidden - No access"
elif echo "$response" | grep -q "HTTP_CODE:200"; then
  echo "✅ 200 OK - Working without auth"
elif echo "$response" | grep -q "HTTP_CODE:500"; then
  echo "❌ 500 Internal Server Error"
  echo "Check error details above"
else
  echo "⚠️ Unknown response"
fi

echo ""
echo "Test 2: Check for specific error message"
echo "-----------------------------------------"
error=$(echo "$response" | grep -o '"error":"[^"]*"' | sed 's/"error":"//;s/"$//')
if [ -n "$error" ]; then
  echo "Error: $error"
fi

echo ""
echo "Test 3: Check /auth/apple endpoint"
echo "-----------------------------------"
apple_response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" https://helpem.ai/auth/apple)
echo "$apple_response"

echo ""
echo "Test 4: Check if deployment succeeded"
echo "--------------------------------------"
echo "Visit: https://helpem.ai/app"
echo "Check Vercel dashboard for deployment logs"
