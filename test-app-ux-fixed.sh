#!/bin/bash

echo "🎯 HELPEM APP UX FUNCTIONAL SIMULATION (Fixed)"
echo "================================================"
echo "Testing: Real user interactions with HelpEm chat AI"
echo ""

log="app_ux_functional_$(date +%s).md"

echo "# HelpEm App UX Functional Test" > "$log"
echo "**Date**: $(date)" >> "$log"
echo "**Endpoint**: /api/chat" >> "$log"
echo "" >> "$log"
echo "---" >> "$log"
echo "" >> "$log"

passed=0
failed=0
ux_issues=0
total=0

test_interaction() {
  local num="$1"
  local scenario="$2"
  local input="$3"
  local expected_action="$4"
  local expected_behavior="$5"
  
  total=$((total + 1))
  
  echo "[$num] $scenario"
  echo "  User: \"$input\""
  
  # Get current date for API
  current_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  current_readable=$(date +"%A, %B %d, %Y at %I:%M %p")
  
  # Build request with proper structure
  request="{
    \"message\": \"$input\",
    \"conversationHistory\": [],
    \"userData\": {
      \"todos\": [],
      \"appointments\": [],
      \"habits\": []
    },
    \"currentDateTime\": \"$current_readable\",
    \"currentDateTimeISO\": \"$current_date\",
    \"fulfilledIntents\": []
  }"
  
  response=$(curl -s -X POST https://helpem.ai/api/chat \
    -H "Content-Type: application/json" \
    -d "$request")
  
  action=$(echo "$response" | grep -o '"action":"[^"]*"' | head -1 | sed 's/"action":"//;s/"$//')
  message=$(echo "$response" | grep -o '"message":"[^"]*"' | head -1 | sed 's/"message":"//;s/"$//' | sed 's/\\n/ /g')
  title=$(echo "$response" | grep -o '"title":"[^"]*"' | head -1 | sed 's/"title":"//;s/"$//')
  error=$(echo "$response" | grep -o '"error":"[^"]*"' | head -1 | sed 's/"error":"//;s/"$//')
  
  if [ -z "$response" ] || [ "$response" = "null" ]; then
    echo "  ❌ ERROR: No response"
    failed=$((failed + 1))
    
    echo "" >> "$log"
    echo "## ❌ FAILED - $scenario" >> "$log"
    echo "**User Input**: \"$input\"" >> "$log"
    echo "**Expected**: $expected_behavior" >> "$log"
    echo "**Actual**: No response received" >> "$log"
    echo "" >> "$log"
    echo "---" >> "$log"
    sleep 2
    return
  fi
  
  if [ -n "$error" ]; then
    echo "  ⚠️  API Error: $error"
    failed=$((failed + 1))
    
    echo "" >> "$log"
    echo "## ❌ FAILED - $scenario" >> "$log"
    echo "**User Input**: \"$input\"" >> "$log"
    echo "**Expected**: $expected_behavior" >> "$log"
    echo "**Actual Error**: $error" >> "$log"
    echo "" >> "$log"
    echo "---" >> "$log"
    sleep 2
    return
  fi
  
  echo "  Action: $action"
  echo "  Message: \"${message:0:100}...\""
  if [ -n "$title" ]; then
    echo "  Title: \"$title\""
  fi
  
  # Validate functionality
  errors=""
  warnings=""
  improvements=""
  
  # Check if action matches expected
  if [ -n "$expected_action" ] && [ "$action" != "$expected_action" ]; then
    if [ "$expected_action" = "create_todo" ] && [ "$action" = "add" ]; then
      # This is acceptable - "add" is the actual action name
      :
    else
      warnings="${warnings}⚠️ Expected action '$expected_action', got '$action'. "
      ux_issues=$((ux_issues + 1))
    fi
  fi
  
  # Check message quality
  word_count=$(echo "$message" | wc -w | tr -d ' ')
  
  if [ "$action" = "add" ] || [ "$action" = "create" ]; then
    # Should have confirmation
    if ! echo "$message" | grep -qiE "(i'll|got it|okay|alright|perfect|done|set)"; then
      warnings="${warnings}⚠️ UX: Missing confirmation in response. "
      ux_issues=$((ux_issues + 1))
    fi
    
    # Should mention what was added
    if [ -n "$title" ] && ! echo "$message" | grep -qi "$title"; then
      warnings="${warnings}⚠️ UX: Confirmation doesn't mention the task title. "
      ux_issues=$((ux_issues + 1))
    fi
  fi
  
  if [ "$action" = "respond" ] && [ -n "$expected_action" ] && [ "$expected_action" != "clarify" ]; then
    errors="${errors}❌ FUNCTIONAL ERROR: Should have created task but only responded with text. "
    failed=$((failed + 1))
  fi
  
  # Check if response is too verbose
  if [ $word_count -gt 60 ]; then
    improvements="${improvements}💡 Response too long ($word_count words). Users prefer quick confirmations under 30 words. "
    ux_issues=$((ux_issues + 1))
  fi
  
  # Determine status
  if [ -n "$errors" ]; then
    status="❌ FAILED"
    echo "  Status: $status"
  elif [ -n "$warnings" ]; then
    status="⚠️  WARNING"
    passed=$((passed + 1))
    echo "  Status: $status"
  elif [ -n "$improvements" ]; then
    status="✅ PASSED (suggestions)"
    passed=$((passed + 1))
    echo "  Status: $status"
  else
    status="✅ PASSED"
    passed=$((passed + 1))
    echo "  Status: $status"
  fi
  
  echo ""
  
  # Log to file
  echo "" >> "$log"
  echo "## $status - $scenario" >> "$log"
  echo "**User Input**: \"$input\"" >> "$log"
  echo "**Expected**: $expected_behavior" >> "$log"
  echo "**Actual Action**: $action" >> "$log"
  if [ -n "$title" ]; then
    echo "**Task Title**: $title" >> "$log"
  fi
  echo "**AI Response** ($word_count words):" >> "$log"
  echo "> $message" >> "$log"
  echo "" >> "$log"
  
  if [ -n "$errors" ]; then
    echo "**🚨 ERRORS**:" >> "$log"
    echo "$errors" >> "$log"
    echo "" >> "$log"
  fi
  
  if [ -n "$warnings" ]; then
    echo "**⚠️  WARNINGS**:" >> "$log"
    echo "$warnings" >> "$log"
    echo "" >> "$log"
  fi
  
  if [ -n "$improvements" ]; then
    echo "**💡 IMPROVEMENTS**:" >> "$log"
    echo "$improvements" >> "$log"
    echo "" >> "$log"
  fi
  
  echo "---" >> "$log"
  
  sleep 2
}

echo "📝 GROUP 1: Basic Task Creation (Core Functionality)"
echo ""
test_interaction 1 "Simple todo creation" \
  "Buy milk" \
  "add" \
  "Should create todo with title 'Buy milk', medium priority"

test_interaction 2 "Todo with urgency" \
  "Call mom ASAP" \
  "add" \
  "Should create todo with high priority (ASAP keyword)"

test_interaction 3 "Todo with time" \
  "Email team tomorrow" \
  "add" \
  "Should create todo for tomorrow"

test_interaction 4 "Natural language todo" \
  "Remind me to pick up dry cleaning" \
  "add" \
  "Should create todo 'pick up dry cleaning'"

echo ""
echo "📅 GROUP 2: Appointment Creation"
echo ""
test_interaction 5 "Appointment with full info" \
  "Doctor appointment tomorrow at 3pm" \
  "add" \
  "Should create appointment for tomorrow 3pm"

test_interaction 6 "Meeting with time" \
  "Team meeting Friday at 10am" \
  "add" \
  "Should create appointment Friday 10am"

echo ""
echo "❓ GROUP 3: Unclear/Ambiguous Inputs"
echo ""
test_interaction 7 "Vague request" \
  "remind me about that thing" \
  "respond" \
  "Should ask for clarification"

test_interaction 8 "Single word" \
  "milk" \
  "respond" \
  "Should ask: grocery list or reminder?"

echo ""
echo "🎯 GROUP 4: Multiple Items"
echo ""
test_interaction 9 "Multiple todos in one" \
  "Add eggs, milk, and bread to my list" \
  "add" \
  "Should create first item, acknowledge all in message"

echo ""
echo "💬 GROUP 5: Conversational Queries"
echo ""
test_interaction 10 "List todos" \
  "What do I need to do today?" \
  "respond" \
  "Should list todos (or say none)"

echo ""
echo "=========================================="
echo "📊 RESULTS"
echo "=========================================="
echo ""
echo "Total Tests: $total"
echo "✅ Passed: $passed"
echo "❌ Failed: $failed"
echo "💡 UX Issues: $ux_issues"
echo ""

pass_rate=$((passed * 100 / total))
echo "Pass Rate: ${pass_rate}%"
echo ""

if [ $failed -eq 0 ]; then
  echo "🎉 NO FUNCTIONAL ERRORS!"
elif [ $failed -le 2 ]; then
  echo "⚠️  Minor functional issues."
else
  echo "🚨 SIGNIFICANT ISSUES - needs attention!"
fi

echo ""
echo "📄 Full log: $log"
