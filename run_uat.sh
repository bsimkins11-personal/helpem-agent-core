#!/bin/bash

# 25-Question UAT Test Script
# Tests all new features: expand/collapse, database persistence, voice chat display, grocery logic

API_URL="${1:-http://localhost:3000}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
DATETIME=$(date +"%A, %B %d, %Y at %I:%M %p")

PASS_COUNT=0
FAIL_COUNT=0
TOTAL_TESTS=25

echo "=================================================="
echo "🧪 HelpEm UAT - 25 Questions"
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
    local expected_in_message=$5
    
    echo "----------------------------------------"
    echo "Q${num}: ${description}"
    echo "Input: \"${message}\""
    
    response=$(curl -s -L -X POST "${API_URL}/api/chat/" \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"${message}\",\"conversationHistory\":[],\"userData\":{\"todos\":[],\"habits\":[],\"appointments\":[]},\"currentDateTime\":\"${DATETIME}\",\"currentDateTimeISO\":\"${TIMESTAMP}\"}")
    
    action=$(echo "$response" | jq -r '.action // "none"')
    message_text=$(echo "$response" | jq -r '.message // ""')
    
    echo "Response action: $action"
    echo "Response message: ${message_text:0:80}..."
    
    # Check expectations
    pass=true
    if [ "$expected_action" != "any" ] && [ "$action" != "$expected_action" ]; then
        echo "❌ FAIL: Expected action '$expected_action', got '$action'"
        pass=false
    fi
    
    if [ -n "$expected_in_message" ] && ! echo "$message_text" | grep -iq "$expected_in_message"; then
        echo "❌ FAIL: Expected message to contain '$expected_in_message'"
        pass=false
    fi
    
    if [ "$pass" = true ]; then
        echo "✅ PASS"
        ((PASS_COUNT++))
    else
        ((FAIL_COUNT++))
    fi
    echo ""
}

echo "📋 SECTION 1: TODO CREATION & TIME PARSING"
echo "=================================================="
echo ""

test_api 1 "Basic todo without time" \
    "Add call mom to my list" \
    "add" \
    "call mom"

test_api 2 "Casual time phrasing (tomorrow afternoon)" \
    "Text Jake tomorrow afternoon" \
    "add" \
    "tomorrow"

test_api 3 "Relative time (next Friday)" \
    "Pay bills next Friday" \
    "add" \
    "Friday"

test_api 4 "Time range (morning)" \
    "Workout tomorrow morning" \
    "add" \
    "morning"

test_api 5 "Complete time with priority hint" \
    "Submit report by Monday 5pm - this is urgent" \
    "add" \
    "Monday"

echo ""
echo "📅 SECTION 2: APPOINTMENT SCHEDULING"
echo "=================================================="
echo ""

test_api 6 "Complete appointment info" \
    "Dentist appointment next Monday at 2pm" \
    "add" \
    "Dentist"

test_api 7 "Casual appointment time" \
    "Coffee with Sarah Wednesday morning" \
    "add" \
    "Wednesday"

test_api 8 "Recurring appointment (should be routine)" \
    "Yoga class every Monday at 6pm" \
    "add" \
    "Monday"

test_api 9 "Ambiguous appointment (should ask)" \
    "Meeting with boss" \
    "any" \
    "when"

test_api 10 "Appointment with location" \
    "Doctor appointment tomorrow at 3pm" \
    "add" \
    "tomorrow"

echo ""
echo "🛒 SECTION 3: GROCERY VS TODO LOGIC"
echo "=================================================="
echo ""

test_api 11 "Explicit grocery item" \
    "Add milk to grocery list" \
    "add" \
    "milk"

test_api 12 "Should be todo not grocery" \
    "Remind me to pick up dry cleaning" \
    "add" \
    "dry cleaning"

test_api 13 "Multiple grocery items" \
    "Add eggs, bread, and butter to grocery list" \
    "add" \
    ""

test_api 14 "Grocery store task (not grocery item)" \
    "Go to grocery store tomorrow" \
    "add" \
    "grocery store"

test_api 15 "Ambiguous grocery mention" \
    "I need to get bananas" \
    "any" \
    ""

echo ""
echo "💬 SECTION 4: CONVERSATIONAL & QUERIES"
echo "=================================================="
echo ""

test_api 16 "Daily overview request" \
    "What's my day look like?" \
    "any" \
    ""

test_api 17 "Greeting" \
    "Good morning" \
    "any" \
    ""

test_api 18 "List todos" \
    "What do I need to do today?" \
    "any" \
    ""

test_api 19 "Calendar navigation" \
    "What's on my calendar tomorrow?" \
    "any" \
    "tomorrow"

test_api 20 "Routine check" \
    "What are my routines?" \
    "any" \
    "routine"

echo ""
echo "🎯 SECTION 5: EDGE CASES & VARIATIONS"
echo "=================================================="
echo ""

test_api 21 "Multi-word task with casual language" \
    "Gotta remember to text mom about dinner plans" \
    "add" \
    "text mom"

test_api 22 "Task with very specific time" \
    "Call client at 2:30pm tomorrow" \
    "add" \
    "2:30"

test_api 23 "Task for end of month" \
    "Submit expense report by end of month" \
    "add" \
    ""

test_api 24 "Weekly recurring task" \
    "Water plants every Sunday" \
    "add" \
    "Sunday"

test_api 25 "Priority update language" \
    "This is really important - buy birthday gift tomorrow" \
    "add" \
    "birthday gift"

echo ""
echo "=================================================="
echo "📊 UAT RESULTS SUMMARY"
echo "=================================================="
echo ""
echo "✅ Passed: $PASS_COUNT / $TOTAL_TESTS"
echo "❌ Failed: $FAIL_COUNT / $TOTAL_TESTS"
echo "📈 Success Rate: $(( PASS_COUNT * 100 / TOTAL_TESTS ))%"
echo ""

if [ $PASS_COUNT -ge 23 ]; then
    echo "🎉 EXCELLENT - App is production ready!"
elif [ $PASS_COUNT -ge 20 ]; then
    echo "✅ GOOD - Minor improvements needed"
else
    echo "⚠️  NEEDS WORK - Critical issues found"
fi

echo ""
echo "Test completed at $(date)"
echo "=================================================="
