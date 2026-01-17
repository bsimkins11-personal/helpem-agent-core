#!/bin/bash

# Full 100-Scenario Support Agent Test
# Tests against live API at helpem.ai/api/support

echo "🧪 SUPPORT AGENT 100-SCENARIO TEST"
echo "==================================="
echo "API: https://helpem.ai/api/support"
echo "Started: $(date)"
echo ""

# Counters
total=0
passed=0
failed=0
warnings=0

# Results file
results_file="test_results_100_$(date +%s).txt"

# Test function
test_scenario() {
  local num="$1"
  local question="$2"
  local expected_words="$3"
  local should_escalate="$4"
  
  total=$((total + 1))
  
  echo "[$num/100] Testing: $question"
  
  response=$(curl -s -X POST https://helpem.ai/api/support \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$question\", \"conversationHistory\": []}" 2>/dev/null)
  
  if [ -z "$response" ]; then
    echo "  ❌ ERROR: No response from API"
    failed=$((failed + 1))
    echo "[$num] FAIL: $question - No response" >> "$results_file"
    echo ""
    return
  fi
  
  message=$(echo "$response" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"$//' | sed 's/\\n/ /g')
  
  if [ -z "$message" ]; then
    echo "  ❌ ERROR: Empty message"
    failed=$((failed + 1))
    echo "[$num] FAIL: $question - Empty message" >> "$results_file"
    echo ""
    return
  fi
  
  # Check word count
  word_count=$(echo "$message" | wc -w | tr -d ' ')
  
  # Check for markdown
  has_markdown=0
  if echo "$message" | grep -qE '(\*\*|__|##|###|\[.*\]\(.*\)|```|^[-*•] )'; then
    has_markdown=1
  fi
  
  # Check for escalation
  has_escalation=0
  if echo "$message" | grep -qiE '(support@helpem\.ai|security@helpem\.ai|press@helpem\.ai)'; then
    has_escalation=1
  fi
  
  # Scoring logic
  status="PASS"
  issues=""
  
  if [ "$has_markdown" -eq 1 ]; then
    status="WARN"
    issues="${issues}markdown "
    warnings=$((warnings + 1))
  fi
  
  if [ "$word_count" -gt "$expected_words" ]; then
    status="WARN"
    issues="${issues}too-long($word_count>${expected_words}) "
    warnings=$((warnings + 1))
  fi
  
  if [ "$should_escalate" = "yes" ] && [ "$has_escalation" -eq 0 ]; then
    status="FAIL"
    issues="${issues}missing-escalation "
    failed=$((failed + 1))
  elif [ "$should_escalate" = "no" ] && [ "$has_escalation" -eq 1 ]; then
    status="WARN"
    issues="${issues}unexpected-escalation "
    warnings=$((warnings + 1))
  fi
  
  if [ "$status" = "PASS" ] && [ -z "$issues" ]; then
    passed=$((passed + 1))
    echo "  ✅ PASS ($word_count words)"
  elif [ "$status" = "WARN" ]; then
    echo "  ⚠️  WARN: $issues($word_count words)"
  else
    echo "  ❌ FAIL: $issues"
  fi
  
  echo "[$num] $status: $question | Words: $word_count | Issues: ${issues:-none}" >> "$results_file"
  echo "  Response: ${message:0:100}..." >> "$results_file"
  echo "" >> "$results_file"
  
  # Rate limiting delay (20 req / 15 min = 3 sec per request minimum)
  sleep 3
}

# Category 1: Basic Features (20)
test_scenario 1 "What is HelpEm?" 50 "no"
test_scenario 2 "How do I add a todo?" 30 "no"
test_scenario 3 "Can I use voice on web?" 20 "no"
test_scenario 4 "Does it work on iPhone?" 20 "no"
test_scenario 5 "What's the difference between a todo and appointment?" 25 "no"
test_scenario 6 "How do I set priority?" 20 "no"
test_scenario 7 "Can I add multiple tasks at once?" 20 "no"
test_scenario 8 "How do routines work?" 20 "no"
test_scenario 9 "Do I need to create an account?" 20 "no"
test_scenario 10 "Where is my data stored?" 20 "no"

echo ""
echo "Progress: 10/100 complete..."
echo ""

test_scenario 11 "Can I edit a task after creating it?" 15 "no"
test_scenario 12 "How do I delete a task?" 20 "no"
test_scenario 13 "What if I make a mistake?" 15 "no"
test_scenario 14 "Can I see all my tasks?" 20 "no"
test_scenario 15 "How do notifications work?" 20 "no"
test_scenario 16 "Can I share lists with family?" 20 "no"
test_scenario 17 "Does it integrate with Google Calendar?" 15 "no"
test_scenario 18 "Can I backup my data?" 15 "no"
test_scenario 19 "What languages do you support?" 10 "no"
test_scenario 20 "Is there a desktop app?" 15 "no"

echo ""
echo "Progress: 20/100 complete..."
echo ""

# Category 2: Pricing & Plans (15)
test_scenario 21 "How much does it cost?" 20 "no"
test_scenario 22 "What's included in the free plan?" 15 "no"
test_scenario 23 "What's the difference between Basic and Premium?" 20 "no"
test_scenario 24 "Is there a student discount?" 10 "yes"
test_scenario 25 "Can I cancel anytime?" 10 "yes"
test_scenario 26 "What payment methods do you accept?" 10 "yes"
test_scenario 27 "Do you offer refunds?" 10 "yes"
test_scenario 28 "Is there a family plan?" 15 "no"
test_scenario 29 "What happens if I hit my monthly limit?" 15 "no"
test_scenario 30 "Can I try Premium before buying?" 10 "yes"

echo ""
echo "Progress: 30/100 complete..."
echo ""

test_scenario 31 "Is there an annual discount?" 10 "no"
test_scenario 32 "What's included in priority support?" 15 "no"
test_scenario 33 "Can I upgrade mid-month?" 10 "yes"
test_scenario 34 "Do you have lifetime pricing?" 10 "yes"
test_scenario 35 "What's API access in Premium?" 15 "no"

echo ""
echo "Progress: 35/100 complete..."
echo ""

# Category 3: Troubleshooting (20)
test_scenario 36 "Voice input isn't working" 20 "no"
test_scenario 37 "I said something but nothing happened" 20 "no"
test_scenario 38 "My tasks disappeared" 10 "yes"
test_scenario 39 "I'm not getting notifications" 15 "no"
test_scenario 40 "App is slow" 15 "no"
test_scenario 41 "Can't log in on iPhone" 10 "yes"
test_scenario 42 "Sign in with Apple failed" 10 "yes"
test_scenario 43 "My microphone icon is missing" 15 "no"
test_scenario 44 "I hear my voice but AI doesn't respond" 15 "no"
test_scenario 45 "Tasks are in wrong category" 20 "no"

echo ""
echo "Progress: 45/100 complete..."
echo ""

test_scenario 46 "Can't see my calendar" 15 "no"
test_scenario 47 "Deleted wrong task, can I undo?" 15 "no"
test_scenario 48 "App crashed" 15 "yes"
test_scenario 49 "Can't access web app" 20 "no"
test_scenario 50 "My data is wrong" 20 "no"
test_scenario 51 "Battery draining fast on iPhone" 15 "no"
test_scenario 52 "Text-to-speech sounds weird" 15 "no"
test_scenario 53 "Can't delete account" 10 "yes"
test_scenario 54 "Forgot my password" 15 "no"
test_scenario 55 "App won't install on old iPhone" 15 "no"

echo ""
echo "Progress: 55/100 complete..."
echo ""

# Category 4: Advanced Usage (15)
test_scenario 56 "Can I add tasks via API?" 15 "no"
test_scenario 57 "How do I use keyboard shortcuts?" 10 "no"
test_scenario 58 "Can I import from Todoist?" 10 "yes"
test_scenario 59 "How does the AI work?" 20 "no"
test_scenario 60 "Can I customize the AI?" 15 "no"
test_scenario 61 "What data do you collect?" 20 "no"
test_scenario 62 "Is my data encrypted?" 15 "no"
test_scenario 63 "Can I export my data?" 10 "yes"
test_scenario 64 "How do I use with Siri?" 15 "no"
test_scenario 65 "Can I access offline?" 15 "no"

echo ""
echo "Progress: 65/100 complete..."
echo ""

test_scenario 66 "What's the monthly usage limit?" 15 "no"
test_scenario 67 "Can I connect to Zapier?" 10 "no"
test_scenario 68 "How do I add location-based reminders?" 10 "no"
test_scenario 69 "Can I add images to tasks?" 10 "no"
test_scenario 70 "How does team collaboration work?" 15 "no"

echo ""
echo "Progress: 70/100 complete..."
echo ""

# Category 5: Edge Cases (15)
test_scenario 71 "I want to add 50 tasks at once" 15 "no"
test_scenario 72 "Can you integrate with Microsoft Teams?" 15 "no"
test_scenario 73 "My boss wants company-wide access" 10 "yes"
test_scenario 74 "I'm a developer, can I contribute?" 10 "yes"
test_scenario 75 "What if HelpEm shuts down?" 10 "yes"
test_scenario 76 "Can I white-label this for my company?" 10 "yes"
test_scenario 77 "I found a security vulnerability" 10 "yes"
test_scenario 78 "Can you build a custom feature for me?" 10 "yes"
test_scenario 79 "Your competitor does X, why don't you?" 15 "no"
test_scenario 80 "I'm a journalist writing about HelpEm" 10 "yes"

echo ""
echo "Progress: 80/100 complete..."
echo ""

test_scenario 81 "Can I invest in HelpEm?" 10 "yes"
test_scenario 82 "What's your privacy policy?" 15 "no"
test_scenario 83 "Are you GDPR compliant?" 10 "no"
test_scenario 84 "Can I use this for medical reminders?" 15 "no"
test_scenario 85 "What if AI misunderstands me?" 15 "no"

echo ""
echo "Progress: 85/100 complete..."
echo ""

# Category 6: Feedback (10)
test_scenario 86 "Can you add dark mode?" 15 "no"
test_scenario 87 "I love this app!" 15 "no"
test_scenario 88 "This is terrible, nothing works" 15 "yes"
test_scenario 89 "Feature X would be perfect" 15 "no"
test_scenario 90 "When is feature X coming?" 15 "no"
test_scenario 91 "Can I beta test new features?" 15 "no"
test_scenario 92 "How do I report a bug?" 15 "no"
test_scenario 93 "Your UI is confusing" 15 "no"
test_scenario 94 "Can I get credits for reporting bugs?" 10 "yes"
test_scenario 95 "I want to speak with a human" 15 "yes"

echo ""
echo "Progress: 95/100 complete..."
echo ""

# Category 7: Confusion (5)
test_scenario 96 "It's not working" 20 "no"
test_scenario 97 "Help" 15 "no"
test_scenario 98 "???" 15 "no"
test_scenario 99 "asdfghjkl" 15 "no"
test_scenario 100 "I don't understand" 15 "no"

echo ""
echo "=========================================="
echo "✅ TEST COMPLETE!"
echo "=========================================="
echo ""
echo "Total Scenarios: $total"
echo "✅ Passed: $passed"
echo "⚠️  Warnings: $warnings"
echo "❌ Failed: $failed"
echo ""
percentage=$((passed * 100 / total))
echo "Pass Rate: ${percentage}%"
echo ""
echo "Detailed results saved to: $results_file"
echo ""
echo "Completed: $(date)"
