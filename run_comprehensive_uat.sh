#!/bin/bash

# Comprehensive 25-Question UAT with proper validation
# Tests API responses and validates based on response type

API_URL="${1:-http://localhost:3001}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
DATETIME=$(date +"%A, %B %d, %Y at %I:%M %p")

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
TOTAL_TESTS=25

declare -a ISSUES

echo "=================================================="
echo "🧪 HelpEm Comprehensive UAT - 25 Questions"
echo "API: $API_URL"
echo "Time: $DATETIME"
echo "=================================================="
echo ""

# Helper function to test
test_api() {
    local num=$1
    local description=$2
    local message=$3
    local expected_action=$4
    local validation_notes=$5
    
    echo "----------------------------------------"
    echo "Q${num}: ${description}"
    echo "Input: \"${message}\""
    
    response=$(curl -s -L -X POST "${API_URL}/api/chat/" \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"${message}\",\"conversationHistory\":[],\"userData\":{\"todos\":[],\"habits\":[],\"appointments\":[]},\"currentDateTime\":\"${DATETIME}\",\"currentDateTimeISO\":\"${TIMESTAMP}\"}")
    
    action=$(echo "$response" | jq -r '.action // "none"')
    type=$(echo "$response" | jq -r '.type // ""')
    title=$(echo "$response" | jq -r '.title // ""')
    priority=$(echo "$response" | jq -r '.priority // ""')
    datetime=$(echo "$response" | jq -r '.datetime // ""')
    message_text=$(echo "$response" | jq -r '.message // ""')
    
    echo "✓ Action: $action"
    [ -n "$type" ] && echo "  Type: $type"
    [ -n "$title" ] && echo "  Title: $title"
    [ -n "$priority" ] && echo "  Priority: $priority"
    [ -n "$datetime" ] && echo "  DateTime: $datetime"
    [ -n "$message_text" ] && echo "  Message: ${message_text:0:60}..."
    
    # Validation
    pass=true
    warnings=()
    
    if [ "$expected_action" != "any" ] && [ "$action" != "$expected_action" ]; then
        echo "❌ FAIL: Expected action '$expected_action', got '$action'"
        pass=false
        ISSUES+=("Q${num}: Wrong action - expected '$expected_action', got '$action'")
    fi
    
    # Action-specific validations
    if [ "$action" = "add" ]; then
        if [ -z "$title" ]; then
            warnings+=("Missing title")
        fi
        if [[ "$message" =~ (tomorrow|next|Monday|Friday|Wednesday|Sunday|morning|afternoon|evening) ]] && [ -z "$datetime" ]; then
            warnings+=("Time mentioned but datetime not set")
        fi
        if [[ "$message" =~ (urgent|important|critical) ]] && [ "$priority" != "high" ]; then
            warnings+=("Priority keyword but not high priority")
        fi
    fi
    
    if [ ${#warnings[@]} -gt 0 ]; then
        for warn in "${warnings[@]}"; do
            echo "⚠️  WARN: $warn"
        done
        ((WARN_COUNT++))
    fi
    
    if [ "$pass" = true ]; then
        echo "✅ PASS"
        ((PASS_COUNT++))
    else
        ((FAIL_COUNT++))
    fi
    
    echo ""
}

echo "📋 SECTION 1: TODO CREATION & TIME PARSING (Critical)"
echo "=================================================="
echo ""

test_api 1 "Basic todo without time" \
    "Add call mom to my list" \
    "add" \
    "Should create todo with title"

test_api 2 "Casual time - tomorrow afternoon" \
    "Text Jake tomorrow afternoon" \
    "add" \
    "Should parse tomorrow afternoon"

test_api 3 "Relative time - next Friday" \
    "Pay bills next Friday" \
    "add" \
    "Should calculate next Friday date"

test_api 4 "Time range - morning" \
    "Workout tomorrow morning" \
    "add" \
    "Should set 9am"

test_api 5 "Priority hint - urgent" \
    "Submit report by Monday 5pm - this is urgent" \
    "add" \
    "Should detect high priority"

echo ""
echo "📅 SECTION 2: APPOINTMENT SCHEDULING"
echo "=================================================="
echo ""

test_api 6 "Complete appointment info" \
    "Dentist appointment next Monday at 2pm" \
    "add" \
    "Should create appointment"

test_api 7 "Casual appointment time" \
    "Coffee with Sarah Wednesday morning" \
    "add" \
    "Should parse Wednesday morning"

test_api 8 "Recurring (should be routine)" \
    "Yoga class every Monday at 6pm" \
    "add" \
    "Should detect weekly pattern"

test_api 9 "Ambiguous - should ask" \
    "Meeting with boss" \
    "respond" \
    "Should ask for time"

test_api 10 "Appointment with time" \
    "Doctor appointment tomorrow at 3pm" \
    "add" \
    "Should create appointment"

echo ""
echo "🛒 SECTION 3: GROCERY VS TODO LOGIC"
echo "=================================================="
echo ""

test_api 11 "Explicit grocery item" \
    "Add milk to grocery list" \
    "add" \
    "Should go to groceries"

test_api 12 "Todo NOT grocery" \
    "Remind me to pick up dry cleaning" \
    "add" \
    "Should be todo not grocery"

test_api 13 "Multiple grocery items" \
    "Add eggs, bread, and butter to grocery list" \
    "add" \
    "Should create multiple items"

test_api 14 "Grocery store task" \
    "Go to grocery store tomorrow" \
    "add" \
    "Should be todo with date"

test_api 15 "Ambiguous grocery" \
    "I need to get bananas" \
    "any" \
    "May ask or create"

echo ""
echo "💬 SECTION 4: CONVERSATIONAL & QUERIES"
echo "=================================================="
echo ""

test_api 16 "Daily overview" \
    "What's my day look like?" \
    "respond" \
    "Should describe schedule"

test_api 17 "Greeting" \
    "Good morning" \
    "respond" \
    "Should greet back"

test_api 18 "List todos" \
    "What do I need to do today?" \
    "respond" \
    "Should list todos"

test_api 19 "Calendar query" \
    "What's on my calendar tomorrow?" \
    "respond" \
    "Should show appointments"

test_api 20 "Routine check" \
    "What are my routines?" \
    "respond" \
    "Should list routines"

echo ""
echo "🎯 SECTION 5: EDGE CASES & VARIATIONS"
echo "=================================================="
echo ""

test_api 21 "Casual language" \
    "Gotta remember to text mom about dinner plans" \
    "add" \
    "Should parse casual speech"

test_api 22 "Specific time 2:30pm" \
    "Call client at 2:30pm tomorrow" \
    "add" \
    "Should handle 30-minute marks"

test_api 23 "End of month" \
    "Submit expense report by end of month" \
    "add" \
    "Should calculate month end"

test_api 24 "Weekly recurring" \
    "Water plants every Sunday" \
    "add" \
    "Should create routine"

test_api 25 "Priority + time" \
    "This is really important - buy birthday gift tomorrow" \
    "add" \
    "Should set high priority + date"

echo ""
echo "=================================================="
echo "📊 UAT RESULTS SUMMARY"
echo "=================================================="
echo ""
echo "✅ Passed: $PASS_COUNT / $TOTAL_TESTS ($(( PASS_COUNT * 100 / TOTAL_TESTS ))%)"
echo "❌ Failed: $FAIL_COUNT / $TOTAL_TESTS"
echo "⚠️  Warnings: $WARN_COUNT / $TOTAL_TESTS"
echo ""

if [ $PASS_COUNT -ge 23 ]; then
    echo "🎉 EXCELLENT - Production ready!"
    status="excellent"
elif [ $PASS_COUNT -ge 20 ]; then
    echo "✅ GOOD - Minor improvements needed"
    status="good"
elif [ $PASS_COUNT -ge 15 ]; then
    echo "⚠️  FAIR - Some issues to address"
    status="fair"
else
    echo "❌ NEEDS WORK - Critical issues found"
    status="needs_work"
fi

if [ ${#ISSUES[@]} -gt 0 ]; then
    echo ""
    echo "🔴 CRITICAL ISSUES:"
    for issue in "${ISSUES[@]}"; do
        echo "  • $issue"
    done
fi

echo ""
echo "Test completed at $(date)"
echo "=================================================="

# Save results
cat > /Users/avpuser/HelpEm_POC/UAT_RESULTS.txt <<EOF
UAT Results - $(date)
==========================================
API: $API_URL
Status: $status

Passed: $PASS_COUNT / $TOTAL_TESTS ($(( PASS_COUNT * 100 / TOTAL_TESTS ))%)
Failed: $FAIL_COUNT / $TOTAL_TESTS
Warnings: $WARN_COUNT / $TOTAL_TESTS

Critical Issues:
$(for issue in "${ISSUES[@]}"; do echo "• $issue"; done)

Next Steps:
$([[ $PASS_COUNT -ge 23 ]] && echo "✓ Ready for production deployment" || echo "• Review and fix failing tests")
$([[ $WARN_COUNT -gt 5 ]] && echo "• Address warnings for optimal behavior")

EOF

echo ""
echo "📄 Results saved to UAT_RESULTS.txt"
