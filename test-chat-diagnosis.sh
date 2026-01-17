#!/bin/bash

echo "🔍 DIAGNOSING CHAT API ISSUE"
echo "============================"
echo ""

echo "Test 1: Simple POST to /api/chat"
echo "---------------------------------"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST https://helpem.ai/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Buy milk", "userData": {"todos": [], "appointments": [], "habits": []}, "conversationHistory": []}')

echo "Response:"
echo "$response"
echo ""

# Check if we got a valid response
if echo "$response" | grep -q "HTTP_CODE:200"; then
  echo "✅ API is responding with 200 OK"
elif echo "$response" | grep -q "HTTP_CODE:429"; then
  echo "⚠️ Rate limit hit - API is working but throttled"
elif echo "$response" | grep -q "HTTP_CODE:500"; then
  echo "❌ Internal server error"
elif echo "$response" | grep -q "HTTP_CODE:400"; then
  echo "❌ Bad request - check payload format"
else
  echo "❌ No HTTP response code received"
fi

echo ""
echo "Test 2: Check response structure"
echo "--------------------------------"
json_response=$(echo "$response" | sed '/HTTP_CODE:/d')
echo "JSON Body:"
echo "$json_response" | head -20
echo ""

if echo "$json_response" | grep -q '"action"'; then
  echo "✅ Response contains 'action' field"
else
  echo "❌ Response missing 'action' field"
fi

if echo "$json_response" | grep -q '"reply"'; then
  echo "✅ Response contains 'reply' field"
else
  echo "⚠️ Response missing 'reply' field (might use 'message' instead)"
fi

if echo "$json_response" | grep -q '"message"'; then
  echo "✅ Response contains 'message' field"
fi

echo ""
echo "Test 3: Check for errors"
echo "------------------------"
if echo "$json_response" | grep -q '"error"'; then
  echo "❌ API returned an error:"
  echo "$json_response" | grep -o '"error":"[^"]*"'
else
  echo "✅ No error field in response"
fi
