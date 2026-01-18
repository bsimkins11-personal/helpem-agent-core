#!/bin/bash

echo "🔧 TESTING URGENCY FIX"
echo "====================="
echo "Verifying 3 scenarios now create tasks immediately"
echo ""

test_urgency() {
  local num="$1"
  local input="$2"
  local expected="$3"
  
  echo "Test $num: \"$input\""
  
  response=$(curl -s -X POST https://helpem.ai/api/chat \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$input\", \"userData\": {\"todos\": [], \"appointments\": [], \"habits\": []}, \"conversationHistory\": []}")
  
  action=$(echo "$response" | grep -o '"action":"[^"]*"' | sed 's/"action":"//;s/"$//')
  title=$(echo "$response" | grep -o '"title":"[^"]*"' | sed 's/"title":"//;s/"$//')
  priority=$(echo "$response" | grep -o '"priority":"[^"]*"' | sed 's/"priority":"//;s/"$//')
  message=$(echo "$response" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"$//' | sed 's/\\n/ /g')
  
  echo "  Action: $action"
  echo "  Title: $title"
  echo "  Priority: $priority"
  echo "  Message: ${message:0:80}..."
  
  if [ "$action" = "add" ] && [ "$priority" = "high" ]; then
    echo "  ✅ FIXED! Creates HIGH priority task immediately"
  elif [ "$action" = "add" ]; then
    echo "  ⚠️ Creates task but priority might be wrong"
  elif [ "$action" = "respond" ]; then
    echo "  ❌ STILL ASKING - Fix didn't work yet"
  else
    echo "  ⚠️ Unexpected action: $action"
  fi
  
  echo ""
  sleep 2
}

test_urgency 1 "I NEED to finish this today!" "Should create HIGH priority task"
test_urgency 2 "Must complete before deadline" "Should create HIGH priority task"
test_urgency 3 "Need this done immediately" "Should create HIGH priority task"

echo "================================"
echo "Urgency fix verification complete"
