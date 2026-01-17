#!/bin/bash

echo "🔄 RE-TESTING 4 IMPROVED SCENARIOS"
echo "=================================="
echo ""

results="retest_results_$(date +%s).md"

echo "# Support Agent Re-Test Results" > "$results"
echo "**Date**: $(date)" >> "$results"
echo "**Testing**: 4 previously failing scenarios after improvements" >> "$results"
echo "" >> "$results"
echo "---" >> "$results"
echo "" >> "$results"

test_scenario() {
  local num="$1"
  local question="$2"
  local old_score="$3"
  
  echo "[$num/4] Testing: $question"
  echo "  Old Score: $old_score"
  
  response=$(curl -s -X POST https://helpem.ai/api/support \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$question\", \"conversationHistory\": []}")
  
  message=$(echo "$response" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"$//' | sed 's/\\n/ /g')
  
  if [ -z "$message" ]; then
    echo "  ❌ ERROR: No response"
    return
  fi
  
  word_count=$(echo "$message" | wc -w | tr -d ' ')
  has_markdown=$(echo "$message" | grep -qE '(\*\*|__|##|###|\[.*\]\(.*\)|```|^[-*•] )' && echo "YES" || echo "NO")
  
  echo "  Response ($word_count words):"
  echo "  \"${message:0:200}...\""
  echo ""
  
  # Write to file
  echo "" >> "$results"
  echo "## Test $num: \"$question\"" >> "$results"
  echo "**Old Score**: $old_score" >> "$results"
  echo "**Word Count**: $word_count" >> "$results"
  echo "**Markdown**: $has_markdown" >> "$results"
  echo "" >> "$results"
  echo "**Full Response**:" >> "$results"
  echo "> $message" >> "$results"
  echo "" >> "$results"
  echo "---" >> "$results"
  
  sleep 3
}

test_scenario 1 "Can I add tasks via API?" "2/7"
test_scenario 2 "Can I export my data?" "2/7"
test_scenario 3 "It's not working" "2/7"
test_scenario 4 "I found a security vulnerability" "5/7"

echo ""
echo "=========================================="
echo "✅ RE-TEST COMPLETE"
echo "=========================================="
echo ""
echo "📄 Detailed results: $results"
echo ""
echo "Manually review responses above to verify:"
echo "  1. API question mentions Premium plan"
echo "  2. Export mentions 'coming soon' + escalates"
echo "  3. 'It's not working' asks clarifying questions"
echo "  4. Security uses security@helpem.ai"
