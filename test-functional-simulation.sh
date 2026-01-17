#!/bin/bash

echo "🎭 SUPPORT AGENT FUNCTIONAL SIMULATION"
echo "======================================"
echo "Testing: Real user interactions with error logging"
echo ""

log="functional_simulation_$(date +%s).md"

echo "# Support Agent Functional Simulation" > "$log"
echo "**Date**: $(date)" >> "$log"
echo "**Purpose**: Simulate real user interactions, log errors, identify improvements" >> "$log"
echo "" >> "$log"
echo "---" >> "$log"
echo "" >> "$log"

# Counters
total_tests=0
passed=0
failed=0
improvements=0

test_conversation() {
  local scenario_num="$1"
  local scenario_name="$2"
  local user_message="$3"
  local expected_behavior="$4"
  local conversation_history="$5"
  
  total_tests=$((total_tests + 1))
  
  echo "[$scenario_num] Testing: $scenario_name"
  echo "  User: \"$user_message\""
  
  # Build request with conversation history
  if [ -z "$conversation_history" ]; then
    request_body="{\"message\": \"$user_message\", \"conversationHistory\": []}"
  else
    request_body="{\"message\": \"$user_message\", \"conversationHistory\": $conversation_history}"
  fi
  
  response=$(curl -s -X POST https://helpem.ai/api/support \
    -H "Content-Type: application/json" \
    -d "$request_body")
  
  message=$(echo "$response" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"$//' | sed 's/\\n/ /g')
  
  if [ -z "$message" ]; then
    echo "  ❌ FUNCTIONAL ERROR: No response from API"
    failed=$((failed + 1))
    
    echo "" >> "$log"
    echo "## ❌ FUNCTIONAL ERROR - $scenario_name" >> "$log"
    echo "**User Input**: \"$user_message\"" >> "$log"
    echo "**Expected**: $expected_behavior" >> "$log"
    echo "**Actual**: No response received" >> "$log"
    echo "**Error Type**: API Failure" >> "$log"
    echo "**Priority**: HIGH" >> "$log"
    echo "" >> "$log"
    echo "---" >> "$log"
    sleep 3
    return
  fi
  
  echo "  Agent: \"${message:0:150}...\""
  
  # Functional validation
  errors=""
  warnings=""
  suggestions=""
  
  # Check for specific functional issues
  case "$scenario_name" in
    *"Multi-turn"*)
      # Check if agent remembers context
      if ! echo "$message" | grep -qi "$conversation_history"; then
        warnings="${warnings}⚠️ May not be using conversation context. "
      fi
      ;;
    *"Incorrect info"*)
      # Check for hallucinations
      if echo "$message" | grep -qi "coming to app store\|not available on iOS\|web only"; then
        errors="${errors}❌ HALLUCINATION: iOS IS available now via TestFlight. "
        failed=$((failed + 1))
      fi
      ;;
    *"pricing"* | *"cost"* | *"$"*)
      # Check pricing accuracy
      if echo "$message" | grep -qi "\$[0-9]" && ! echo "$message" | grep -qi "2.*month\|4.99\|9.99"; then
        errors="${errors}❌ INCORRECT PRICING: Wrong dollar amount. "
        failed=$((failed + 1))
      fi
      ;;
    *"escalat"*)
      # Check escalation
      if ! echo "$message" | grep -qi "support@helpem.ai\|security@helpem.ai"; then
        errors="${errors}❌ MISSING ESCALATION: Should escalate to support/security email. "
        failed=$((failed + 1))
      fi
      ;;
  esac
  
  # Check for markdown (should be stripped)
  if echo "$message" | grep -qE '(\*\*|__|##|###|```|^[-*•] )'; then
    warnings="${warnings}⚠️ Contains markdown formatting. "
    improvements=$((improvements + 1))
  fi
  
  # Check length
  word_count=$(echo "$message" | wc -w | tr -d ' ')
  if [ $word_count -gt 100 ]; then
    suggestions="${suggestions}💡 Response too long ($word_count words). Consider being more concise. "
    improvements=$((improvements + 1))
  fi
  
  # Check for support email format
  if echo "$message" | grep -q "support@helpem.ai" && ! echo "$message" | grep -qi "email support@helpem.ai"; then
    suggestions="${suggestions}💡 Escalation could be clearer (suggest 'email support@helpem.ai'). "
  fi
  
  # Determine status
  if [ -n "$errors" ]; then
    status="❌ FAILED"
    echo "  $status"
  elif [ -n "$warnings" ]; then
    status="⚠️ WARNING"
    passed=$((passed + 1))
    echo "  $status"
  elif [ -n "$suggestions" ]; then
    status="✅ PASSED (with suggestions)"
    passed=$((passed + 1))
    echo "  $status"
  else
    status="✅ PASSED"
    passed=$((passed + 1))
    echo "  $status"
  fi
  
  echo ""
  
  # Log to file
  echo "" >> "$log"
  echo "## $status - $scenario_name" >> "$log"
  echo "**User Input**: \"$user_message\"" >> "$log"
  echo "**Expected Behavior**: $expected_behavior" >> "$log"
  echo "**Agent Response** ($word_count words):" >> "$log"
  echo "> $message" >> "$log"
  echo "" >> "$log"
  
  if [ -n "$errors" ]; then
    echo "**🚨 FUNCTIONAL ERRORS**:" >> "$log"
    echo "$errors" >> "$log"
    echo "" >> "$log"
  fi
  
  if [ -n "$warnings" ]; then
    echo "**⚠️ WARNINGS**:" >> "$log"
    echo "$warnings" >> "$log"
    echo "" >> "$log"
  fi
  
  if [ -n "$suggestions" ]; then
    echo "**💡 IMPROVEMENT SUGGESTIONS**:" >> "$log"
    echo "$suggestions" >> "$log"
    echo "" >> "$log"
  fi
  
  echo "---" >> "$log"
  
  sleep 3
}

# Scenario 1: Basic functionality
echo "📋 SCENARIO GROUP 1: Basic Functionality"
echo ""
test_conversation 1 "Basic question - What is HelpEm" \
  "What is HelpEm?" \
  "Should mention: AI/voice-first, task management, natural language"

test_conversation 2 "Platform availability - iOS" \
  "Can I use this on my iPhone?" \
  "Should say YES, mention TestFlight/alpha, iOS 15+"

test_conversation 3 "Feature question - Voice input" \
  "How does voice input work?" \
  "Should mention: click mic, Chrome/Safari/Edge, microphone permission"

# Scenario 2: Multi-turn conversations (context memory)
echo ""
echo "🔄 SCENARIO GROUP 2: Multi-turn Conversations"
echo ""
test_conversation 4 "Multi-turn - Follow-up question" \
  "What about Android?" \
  "Should reference iOS from previous context, say Android not yet available" \
  "[{\"role\":\"user\",\"content\":\"Can I use this on my iPhone?\"},{\"role\":\"assistant\",\"content\":\"Yes! iOS app available now via TestFlight.\"}]"

test_conversation 5 "Multi-turn - Clarification request" \
  "What do you mean by TestFlight?" \
  "Should explain TestFlight is Apple's beta testing platform" \
  "[{\"role\":\"user\",\"content\":\"Can I use this on my iPhone?\"},{\"role\":\"assistant\",\"content\":\"Yes! iOS app available now via TestFlight.\"}]"

# Scenario 3: Error conditions & edge cases
echo ""
echo "🚨 SCENARIO GROUP 3: Error Conditions"
echo ""
test_conversation 6 "Gibberish input" \
  "asdfjkl;qwer" \
  "Should gracefully handle, ask to rephrase or ask real question"

test_conversation 7 "Empty/vague input" \
  "help" \
  "Should ask clarifying questions, offer examples"

test_conversation 8 "Very long question" \
  "I've been trying to use HelpEm for the past few hours and I'm having trouble with voice input, it's not recognizing what I'm saying and I don't know if it's my microphone or the app or my browser and I'm using Chrome on a Mac and I've tried refreshing and I've tried clearing my cache and nothing seems to work and I'm getting really frustrated because this app looked really cool but I can't get it to work properly" \
  "Should handle long input, extract key issue (voice not working), provide troubleshooting"

# Scenario 4: Incorrect information detection
echo ""
echo "🔍 SCENARIO GROUP 4: Accuracy Validation"
echo ""
test_conversation 9 "Pricing accuracy check" \
  "How much does Premium cost?" \
  "Should say $9.99/month, mention features like unlimited, team, API"

test_conversation 10 "Feature accuracy - API access" \
  "Do I need Premium for API access?" \
  "Should say YES, Premium includes API access"

test_conversation 11 "Alpha status accuracy" \
  "What are the current limits?" \
  "Should mention: alpha is free, $2/month API limit, ~1000 messages"

# Scenario 5: Escalation logic
echo ""
echo "🎯 SCENARIO GROUP 5: Escalation Testing"
echo ""
test_conversation 12 "Should escalate - Billing" \
  "I want a refund" \
  "MUST escalate to support@helpem.ai immediately"

test_conversation 13 "Should escalate - Security" \
  "I found a bug that exposes user data" \
  "MUST escalate to security@helpem.ai with URGENT"

test_conversation 14 "Should NOT escalate - General question" \
  "How do I set a high priority task?" \
  "Should answer directly: say urgent or ASAP, should NOT escalate"

test_conversation 15 "Should escalate AFTER clarification" \
  "Nothing works" \
  "Should ask what specifically isn't working, NOT escalate immediately"

# Scenario 6: Edge cases & special situations
echo ""
echo "🎪 SCENARIO GROUP 6: Edge Cases"
echo ""
test_conversation 16 "Special characters" \
  "Can I use émojis 🎉 in tasks?" \
  "Should handle gracefully, likely say yes for task content"

test_conversation 17 "Competitor mention" \
  "Is this better than Todoist?" \
  "Should focus on HelpEm's strengths (voice-first), not bash competitors"

test_conversation 18 "Medical/critical use case" \
  "Can I use this for medication reminders?" \
  "Should say yes for personal use BUT clarify not a medical device"

# Scenario 7: User frustration handling
echo ""
echo "😤 SCENARIO GROUP 7: Frustrated Users"
echo ""
test_conversation 19 "Angry user" \
  "This app is garbage, worst thing I've ever used" \
  "Should be empathetic, apologize, ask specifics, escalate to support@"

test_conversation 20 "Impatient user" \
  "Just tell me if it works on iPhone YES OR NO" \
  "Should give direct answer: YES, works on iPhone via TestFlight"

echo ""
echo "=========================================="
echo "📊 FUNCTIONAL SIMULATION COMPLETE"
echo "=========================================="
echo ""
echo "Total Tests: $total_tests"
echo "✅ Passed: $passed"
echo "❌ Failed: $failed"
echo "💡 Improvements Identified: $improvements"
echo ""

pass_rate=$((passed * 100 / total_tests))
echo "Pass Rate: ${pass_rate}%"
echo ""

if [ $failed -eq 0 ]; then
  echo "🎉 NO FUNCTIONAL ERRORS! Agent working correctly."
elif [ $failed -le 2 ]; then
  echo "⚠️ Minor functional issues found. Review errors."
else
  echo "🚨 SIGNIFICANT FUNCTIONAL ISSUES! Immediate attention needed."
fi

echo ""
echo "📄 Detailed log: $log"
echo ""
echo "Review the log for:"
echo "  - ❌ Functional errors (incorrect behavior)"
echo "  - ⚠️ Warnings (potential issues)"
echo "  - 💡 Improvement suggestions (optimization opportunities)"
