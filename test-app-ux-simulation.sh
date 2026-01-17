#!/bin/bash

echo "🎯 HELPEM APP UX FUNCTIONAL SIMULATION"
echo "======================================"
echo "Testing: Real user interactions with the main app"
echo "Endpoint: /api/chat (main AI assistant)"
echo ""

log="app_ux_simulation_$(date +%s).md"

echo "# HelpEm App UX Functional Simulation" > "$log"
echo "**Date**: $(date)" >> "$log"
echo "**Purpose**: Test real user interactions, log functional errors, identify UX improvements" >> "$log"
echo "" >> "$log"
echo "---" >> "$log"
echo "" >> "$log"

# Counters
total_tests=0
passed=0
failed=0
ux_issues=0

test_user_interaction() {
  local scenario_num="$1"
  local scenario_name="$2"
  local user_input="$3"
  local expected_action="$4"
  local expected_response_type="$5"
  
  total_tests=$((total_tests + 1))
  
  echo "[$scenario_num] $scenario_name"
  echo "  User says: \"$user_input\""
  
  response=$(curl -s -X POST https://helpem.ai/api/chat \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$user_input\"}")
  
  reply=$(echo "$response" | grep -o '"reply":"[^"]*"' | sed 's/"reply":"//;s/"$//' | sed 's/\\n/ /g')
  action=$(echo "$response" | grep -o '"action":"[^"]*"' | sed 's/"action":"//;s/"$//')
  
  if [ -z "$reply" ]; then
    echo "  ❌ FUNCTIONAL ERROR: No response from app"
    failed=$((failed + 1))
    
    echo "" >> "$log"
    echo "## ❌ FUNCTIONAL ERROR - $scenario_name" >> "$log"
    echo "**User Input**: \"$user_input\"" >> "$log"
    echo "**Expected Action**: $expected_action" >> "$log"
    echo "**Expected Response**: $expected_response_type" >> "$log"
    echo "**Actual**: No response received" >> "$log"
    echo "**Error Type**: API Failure / Timeout" >> "$log"
    echo "**Priority**: CRITICAL" >> "$log"
    echo "" >> "$log"
    echo "---" >> "$log"
    sleep 2
    return
  fi
  
  echo "  AI Action: $action"
  echo "  AI Reply: \"${reply:0:100}...\""
  
  # Functional validation
  errors=""
  warnings=""
  ux_improvements=""
  
  # Check if correct action was taken
  if [ -n "$expected_action" ] && [ "$action" != "$expected_action" ]; then
    errors="${errors}❌ WRONG ACTION: Expected '$expected_action', got '$action'. "
    failed=$((failed + 1))
  fi
  
  # Check response appropriateness
  case "$expected_response_type" in
    "confirmation")
      if ! echo "$reply" | grep -qiE "(created|added|got it|done|set)"; then
        warnings="${warnings}⚠️ UX: Should confirm action was completed. "
        ux_issues=$((ux_issues + 1))
      fi
      ;;
    "clarification")
      if ! echo "$reply" | grep -qiE "(what|when|which|could you|can you clarify)"; then
        warnings="${warnings}⚠️ UX: Should ask clarifying question. "
        ux_issues=$((ux_issues + 1))
      fi
      ;;
    "error_handling")
      if ! echo "$reply" | grep -qiE "(sorry|couldn't|unable|problem|issue)"; then
        warnings="${warnings}⚠️ UX: Should acknowledge error gracefully. "
        ux_issues=$((ux_issues + 1))
      fi
      ;;
  esac
  
  # Check response length
  word_count=$(echo "$reply" | wc -w | tr -d ' ')
  if [ $word_count -gt 50 ]; then
    ux_improvements="${ux_improvements}💡 Response too verbose ($word_count words). Users want quick confirmations. "
    ux_issues=$((ux_issues + 1))
  fi
  
  # Check for natural language
  if echo "$reply" | grep -qE "(error code|exception|undefined|null)"; then
    errors="${errors}❌ EXPOSED TECHNICAL ERROR: User-facing text contains technical jargon. "
    failed=$((failed + 1))
  fi
  
  # Check for helpful context
  if [ "$action" = "create_todo" ] || [ "$action" = "create_appointment" ]; then
    if ! echo "$reply" | grep -qE "(priority|time|date|when|what)"; then
      ux_improvements="${ux_improvements}💡 Could mention what was captured (priority, time, etc.). "
    fi
  fi
  
  # Determine status
  if [ -n "$errors" ]; then
    status="❌ FAILED"
    echo "  Status: $status"
  elif [ -n "$warnings" ]; then
    status="⚠️ WARNING"
    passed=$((passed + 1))
    echo "  Status: $status"
  elif [ -n "$ux_improvements" ]; then
    status="✅ PASSED (UX suggestions)"
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
  echo "## $status - $scenario_name" >> "$log"
  echo "**User Input**: \"$user_input\"" >> "$log"
  echo "**Expected Action**: $expected_action" >> "$log"
  echo "**Expected Response Type**: $expected_response_type" >> "$log"
  echo "**Actual Action**: $action" >> "$log"
  echo "**AI Response** ($word_count words):" >> "$log"
  echo "> $reply" >> "$log"
  echo "" >> "$log"
  
  if [ -n "$errors" ]; then
    echo "**🚨 FUNCTIONAL ERRORS**:" >> "$log"
    echo "$errors" >> "$log"
    echo "" >> "$log"
  fi
  
  if [ -n "$warnings" ]; then
    echo "**⚠️ UX WARNINGS**:" >> "$log"
    echo "$warnings" >> "$log"
    echo "" >> "$log"
  fi
  
  if [ -n "$ux_improvements" ]; then
    echo "**💡 UX IMPROVEMENTS**:" >> "$log"
    echo "$ux_improvements" >> "$log"
    echo "" >> "$log"
  fi
  
  echo "---" >> "$log"
  
  sleep 2
}

# Test Group 1: Basic Task Creation
echo "📝 TEST GROUP 1: Basic Task Creation"
echo ""
test_user_interaction 1 "Simple todo" \
  "Buy milk" \
  "create_todo" \
  "confirmation"

test_user_interaction 2 "Todo with priority" \
  "Call mom ASAP" \
  "create_todo" \
  "confirmation"

test_user_interaction 3 "Todo with due date" \
  "Email team tomorrow" \
  "create_todo" \
  "confirmation"

# Test Group 2: Appointments
echo ""
echo "📅 TEST GROUP 2: Appointment Creation"
echo ""
test_user_interaction 4 "Appointment with time" \
  "Doctor appointment at 3pm Friday" \
  "create_appointment" \
  "confirmation"

test_user_interaction 5 "Meeting with duration" \
  "Team meeting tomorrow at 10am" \
  "create_appointment" \
  "confirmation"

# Test Group 3: Ambiguous Inputs
echo ""
echo "❓ TEST GROUP 3: Ambiguous/Unclear Inputs"
echo ""
test_user_interaction 6 "Vague request" \
  "remind me about the thing" \
  "clarify" \
  "clarification"

test_user_interaction 7 "Missing information" \
  "Schedule meeting" \
  "clarify" \
  "clarification"

test_user_interaction 8 "Too general" \
  "help me organize" \
  "clarify" \
  "clarification"

# Test Group 4: Complex Requests
echo ""
echo "🎯 TEST GROUP 4: Complex Multi-Action Requests"
echo ""
test_user_interaction 9 "Multiple todos" \
  "Add eggs, milk, and bread to my list" \
  "create_todo" \
  "confirmation"

test_user_interaction 10 "Todo with context" \
  "Buy birthday gift for Sarah next week, something around 50 dollars" \
  "create_todo" \
  "confirmation"

# Test Group 5: Natural Language Variations
echo ""
echo "💬 TEST GROUP 5: Natural Language Variations"
echo ""
test_user_interaction 11 "Casual language" \
  "gotta pick up dry cleaning tmrw" \
  "create_todo" \
  "confirmation"

test_user_interaction 12 "Formal language" \
  "Please schedule a quarterly review meeting for next Monday at 2 PM" \
  "create_appointment" \
  "confirmation"

test_user_interaction 13 "Shorthand" \
  "mtg w/ john 3pm" \
  "create_appointment" \
  "confirmation"

# Test Group 6: Queries & Information Requests
echo ""
echo "📊 TEST GROUP 6: Queries & Information"
echo ""
test_user_interaction 14 "List request" \
  "What do I need to do today?" \
  "query_tasks" \
  "confirmation"

test_user_interaction 15 "Status check" \
  "What's on my calendar?" \
  "query_appointments" \
  "confirmation"

# Test Group 7: Error Conditions
echo ""
echo "🚨 TEST GROUP 7: Error Conditions & Edge Cases"
echo ""
test_user_interaction 16 "Gibberish" \
  "asdfghjkl" \
  "clarify" \
  "clarification"

test_user_interaction 17 "Special characters" \
  "Buy @#$% for &*()!" \
  "create_todo" \
  "confirmation"

test_user_interaction 18 "Very long input" \
  "I need to remember to buy groceries including milk eggs bread cheese butter yogurt apples bananas oranges chicken beef pork vegetables carrots broccoli spinach lettuce tomatoes cucumbers onions garlic potatoes rice pasta cereal coffee tea juice soda water and cleaning supplies" \
  "create_todo" \
  "confirmation"

# Test Group 8: Voice-Specific Scenarios
echo ""
echo "🎤 TEST GROUP 8: Voice Input Patterns"
echo ""
test_user_interaction 19 "Spoken filler words" \
  "um, I need to, like, buy milk and stuff" \
  "create_todo" \
  "confirmation"

test_user_interaction 20 "Run-on sentence" \
  "I need to call mom and then pick up the kids from school and also buy groceries on the way home" \
  "create_todo" \
  "confirmation"

echo ""
echo "=========================================="
echo "📊 APP UX SIMULATION COMPLETE"
echo "=========================================="
echo ""
echo "Total Tests: $total_tests"
echo "✅ Passed: $passed"
echo "❌ Failed: $failed"
echo "💡 UX Issues Identified: $ux_issues"
echo ""

pass_rate=$((passed * 100 / total_tests))
echo "Pass Rate: ${pass_rate}%"
echo ""

if [ $failed -eq 0 ]; then
  echo "🎉 NO FUNCTIONAL ERRORS! App working correctly."
elif [ $failed -le 2 ]; then
  echo "⚠️ Minor functional issues. Review errors."
else
  echo "🚨 SIGNIFICANT ISSUES! Immediate attention needed."
fi

if [ $ux_issues -gt 10 ]; then
  echo "💡 Many UX improvements identified. Consider prioritizing."
elif [ $ux_issues -gt 5 ]; then
  echo "💡 Several UX improvements available."
else
  echo "💡 Few UX improvements needed. Good experience!"
fi

echo ""
echo "📄 Detailed log: $log"
echo ""
echo "Review the log for:"
echo "  - ❌ Functional errors (broken features)"
echo "  - ⚠️ UX warnings (confusing interactions)"
echo "  - 💡 UX improvements (enhancement opportunities)"
