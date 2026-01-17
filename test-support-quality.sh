#!/bin/bash

echo "🎯 SUPPORT AGENT QUALITY TEST"
echo "============================="
echo "Testing: Intelligence, Accuracy, Helpfulness"
echo ""

# Results file
results="support_quality_test_$(date +%s).md"

echo "# Support Agent Quality Test Results" > "$results"
echo "**Date**: $(date)" >> "$results"
echo "**API**: https://helpem.ai/api/support" >> "$results"
echo "" >> "$results"
echo "---" >> "$results"
echo "" >> "$results"

# Counters
total=0
excellent=0
good=0
needs_work=0
poor=0

test_quality() {
  local category="$1"
  local question="$2"
  local expected_key_points="$3"
  local should_escalate="$4"
  
  total=$((total + 1))
  
  echo "Testing: $question"
  
  response=$(curl -s -X POST https://helpem.ai/api/support \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$question\", \"conversationHistory\": []}")
  
  message=$(echo "$response" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"$//' | sed 's/\\n/ /g')
  
  if [ -z "$message" ]; then
    echo "  ❌ ERROR: No response"
    echo "" >> "$results"
    echo "## ❌ $category: $question" >> "$results"
    echo "**ERROR**: No response from API" >> "$results"
    poor=$((poor + 1))
    sleep 3
    return
  fi
  
  # Analysis
  word_count=$(echo "$message" | wc -w | tr -d ' ')
  has_markdown=$(echo "$message" | grep -qE '(\*\*|__|##|###|\[.*\]\(.*\)|```|^[-*•] )' && echo "YES" || echo "NO")
  has_escalation=$(echo "$message" | grep -qiE 'support@helpem\.ai' && echo "YES" || echo "NO")
  
  # Score response
  score=0
  issues=""
  strengths=""
  
  # Check escalation correctness
  if [ "$should_escalate" = "yes" ]; then
    if [ "$has_escalation" = "YES" ]; then
      score=$((score + 2))
      strengths="${strengths}✅ Correct escalation. "
    else
      issues="${issues}❌ MISSING escalation to support@helpem.ai. "
    fi
  else
    if [ "$has_escalation" = "YES" ]; then
      issues="${issues}⚠️ Unnecessary escalation. "
      score=$((score - 1))
    else
      score=$((score + 1))
      strengths="${strengths}✅ No unnecessary escalation. "
    fi
  fi
  
  # Check for key points (simple substring check)
  IFS='|' read -ra POINTS <<< "$expected_key_points"
  found_points=0
  for point in "${POINTS[@]}"; do
    if echo "$message" | grep -qi "$point"; then
      found_points=$((found_points + 1))
    fi
  done
  
  total_points=${#POINTS[@]}
  if [ $found_points -eq $total_points ]; then
    score=$((score + 3))
    strengths="${strengths}✅ All key points covered. "
  elif [ $found_points -gt 0 ]; then
    score=$((score + 1))
    issues="${issues}⚠️ Only $found_points/$total_points key points covered. "
  else
    issues="${issues}❌ Missing key information. "
  fi
  
  # Check conciseness
  if [ $word_count -le 50 ]; then
    score=$((score + 1))
    strengths="${strengths}✅ Concise (${word_count} words). "
  elif [ $word_count -le 100 ]; then
    strengths="${strengths}👍 Good length (${word_count} words). "
  else
    issues="${issues}⚠️ Too long (${word_count} words). "
  fi
  
  # Check markdown
  if [ "$has_markdown" = "NO" ]; then
    score=$((score + 1))
    strengths="${strengths}✅ No markdown. "
  else
    issues="${issues}❌ Contains markdown formatting. "
    score=$((score - 1))
  fi
  
  # Final grade
  grade=""
  if [ $score -ge 6 ]; then
    grade="EXCELLENT ⭐⭐⭐"
    excellent=$((excellent + 1))
  elif [ $score -ge 4 ]; then
    grade="GOOD ✅"
    good=$((good + 1))
  elif [ $score -ge 2 ]; then
    grade="NEEDS WORK ⚠️"
    needs_work=$((needs_work + 1))
  else
    grade="POOR ❌"
    poor=$((poor + 1))
  fi
  
  echo "  $grade (Score: $score/7)"
  echo ""
  
  # Write to file
  echo "" >> "$results"
  echo "## $grade - $category" >> "$results"
  echo "**Question**: \"$question\"" >> "$results"
  echo "" >> "$results"
  echo "**Response** (${word_count} words):" >> "$results"
  echo "> $message" >> "$results"
  echo "" >> "$results"
  echo "**Score**: $score/7" >> "$results"
  echo "" >> "$results"
  echo "**Strengths**:" >> "$results"
  echo "$strengths" >> "$results"
  echo "" >> "$results"
  if [ -n "$issues" ]; then
    echo "**Issues**:" >> "$results"
    echo "$issues" >> "$results"
    echo "" >> "$results"
  fi
  echo "**Expected Key Points**: $expected_key_points" >> "$results"
  echo "" >> "$results"
  echo "---" >> "$results"
  
  sleep 3
}

# Test critical scenarios
echo "📋 CATEGORY: Core Features"
echo ""
test_quality "Core Features" "What is HelpEm?" "voice|task|natural|ai" "no"
test_quality "Core Features" "Does it work on iPhone?" "yes|ios|testflight|available" "no"
test_quality "Core Features" "How do I add a todo?" "say|type|just" "no"

echo ""
echo "💰 CATEGORY: Pricing"
echo ""
test_quality "Pricing" "How much does it cost?" "alpha|free|1000|messages" "no"
test_quality "Pricing" "Can I cancel anytime?" "support@helpem.ai" "yes"
test_quality "Pricing" "What's included in the free plan?" "50|tasks|basic" "no"

echo ""
echo "🔧 CATEGORY: Troubleshooting"
echo ""
test_quality "Troubleshooting" "Voice input isn't working" "microphone|permission|chrome|safari" "no"
test_quality "Troubleshooting" "My tasks disappeared" "support@helpem.ai" "yes"
test_quality "Troubleshooting" "Can't log in on iPhone" "support@helpem.ai" "yes"

echo ""
echo "🚀 CATEGORY: Advanced"
echo ""
test_quality "Advanced" "Can I add tasks via API?" "premium|api" "no"
test_quality "Advanced" "Is my data encrypted?" "yes|encrypted|secure" "no"
test_quality "Advanced" "Can I export my data?" "support@helpem.ai|coming" "yes"

echo ""
echo "😊 CATEGORY: Escalation"
echo ""
test_quality "Escalation" "I want to speak with a human" "support@helpem.ai" "yes"
test_quality "Escalation" "I found a security vulnerability" "security@helpem.ai|support@helpem.ai" "yes"
test_quality "Escalation" "This is terrible, nothing works" "support@helpem.ai" "yes"

echo ""
echo "❓ CATEGORY: Unclear Questions"
echo ""
test_quality "Unclear" "???" "help|ask|try" "no"
test_quality "Unclear" "It's not working" "what|specifically" "no"

echo ""
echo "=========================================="
echo "📊 FINAL RESULTS"
echo "=========================================="
echo ""
echo "Total Tests: $total"
echo "⭐⭐⭐ Excellent: $excellent"
echo "✅ Good: $good"
echo "⚠️  Needs Work: $needs_work"
echo "❌ Poor: $poor"
echo ""

overall_pass=$((excellent + good))
pass_rate=$((overall_pass * 100 / total))

echo "Pass Rate: ${pass_rate}% (Excellent + Good)"
echo ""

if [ $pass_rate -ge 90 ]; then
  echo "🎉 OUTSTANDING! Agent is production-ready."
elif [ $pass_rate -ge 75 ]; then
  echo "✅ GOOD! Minor improvements recommended."
elif [ $pass_rate -ge 60 ]; then
  echo "⚠️  NEEDS WORK. Significant improvements needed."
else
  echo "❌ POOR. Major overhaul required."
fi

echo "" >> "$results"
echo "---" >> "$results"
echo "" >> "$results"
echo "## Summary" >> "$results"
echo "" >> "$results"
echo "| Grade | Count | Percentage |" >> "$results"
echo "|-------|-------|------------|" >> "$results"
echo "| ⭐⭐⭐ Excellent | $excellent | $(($excellent * 100 / $total))% |" >> "$results"
echo "| ✅ Good | $good | $(($good * 100 / $total))% |" >> "$results"
echo "| ⚠️ Needs Work | $needs_work | $(($needs_work * 100 / $total))% |" >> "$results"
echo "| ❌ Poor | $poor | $(($poor * 100 / $total))% |" >> "$results"
echo "| **TOTAL** | **$total** | **100%** |" >> "$results"
echo "" >> "$results"
echo "**Overall Pass Rate**: ${pass_rate}% (Excellent + Good)" >> "$results"

echo ""
echo "📄 Detailed results: $results"
echo ""
echo "Completed: $(date)"
