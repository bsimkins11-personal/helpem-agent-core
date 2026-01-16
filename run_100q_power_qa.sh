#!/bin/bash

# 100-Question Power QA - Comprehensive Testing
# Makes HelpEm rock solid across all categories

API_URL="${1:-http://localhost:3001}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
DATETIME=$(date +"%A, %B %d, %Y at %I:%M %p")

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
TOTAL_TESTS=100

declare -a ISSUES
declare -a WARNINGS

echo "=================================================="
echo "🔥 HelpEm 100-Question Power QA"
echo "=================================================="
echo "API: $API_URL"
echo "Time: $DATETIME"
echo "Target: Rock Solid Production Quality"
echo "=================================================="
echo ""

# Test helper with enhanced validation
test_qa() {
    local num=$1
    local category=$2
    local description=$3
    local message=$4
    local expected_action=$5
    local validation_checks=$6
    
    printf "Q%-3d [%-20s] " "$num" "$category"
    
    response=$(curl -s -L -X POST "${API_URL}/api/chat/" \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"${message}\",\"conversationHistory\":[],\"userData\":{\"todos\":[],\"habits\":[],\"appointments\":[]},\"currentDateTime\":\"${DATETIME}\",\"currentDateTimeISO\":\"${TIMESTAMP}\"}" 2>/dev/null)
    
    action=$(echo "$response" | jq -r '.action // "none"' 2>/dev/null)
    type=$(echo "$response" | jq -r '.type // ""' 2>/dev/null)
    title=$(echo "$response" | jq -r '.title // ""' 2>/dev/null)
    priority=$(echo "$response" | jq -r '.priority // ""' 2>/dev/null)
    datetime=$(echo "$response" | jq -r '.datetime // ""' 2>/dev/null)
    
    # Validation
    pass=true
    warn=false
    
    if [ "$expected_action" != "any" ] && [ "$action" != "$expected_action" ]; then
        echo "❌ FAIL - Wrong action: expected '$expected_action', got '$action'"
        pass=false
        ISSUES+=("Q${num}: $description - Wrong action")
    else
        # Additional validation checks
        if [[ "$validation_checks" == *"requires_title"* ]] && [ -z "$title" ]; then
            echo "⚠️  WARN - Missing title"
            warn=true
            WARNINGS+=("Q${num}: Missing title")
        elif [[ "$validation_checks" == *"requires_datetime"* ]] && [ -z "$datetime" ]; then
            echo "⚠️  WARN - Missing datetime"
            warn=true
            WARNINGS+=("Q${num}: Missing datetime for time-based task")
        elif [[ "$validation_checks" == *"should_be_high_priority"* ]] && [ "$priority" != "high" ]; then
            echo "⚠️  WARN - Should be high priority"
            warn=true
            WARNINGS+=("Q${num}: Priority should be high")
        else
            echo "✅ PASS"
            ((PASS_COUNT++))
        fi
    fi
    
    if [ "$pass" = false ]; then
        ((FAIL_COUNT++))
    elif [ "$warn" = true ]; then
        ((WARN_COUNT++))
        ((PASS_COUNT++))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 SECTION 1: TODO CREATION - BASIC (20 questions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_qa 1 "TODO-BASIC" "Simple task" "Add buy milk to my list" "add" "requires_title"
test_qa 2 "TODO-BASIC" "Call someone" "Remind me to call dad" "add" "requires_title"
test_qa 3 "TODO-BASIC" "Email task" "Email the team about the update" "add" "requires_title"
test_qa 4 "TODO-BASIC" "Meeting prep" "Prepare slides for presentation" "add" "requires_title"
test_qa 5 "TODO-BASIC" "Personal task" "Water the plants" "add" "requires_title"
test_qa 6 "TODO-BASIC" "Work task" "Review quarterly report" "add" "requires_title"
test_qa 7 "TODO-BASIC" "Household" "Clean the garage" "add" "requires_title"
test_qa 8 "TODO-BASIC" "Finance" "Pay electricity bill" "add" "requires_title"
test_qa 9 "TODO-BASIC" "Health" "Schedule dentist checkup" "add" "requires_title"
test_qa 10 "TODO-BASIC" "Shopping" "Order new running shoes" "add" "requires_title"

test_qa 11 "TODO-BASIC" "With verb" "Need to book flight tickets" "add" "requires_title"
test_qa 12 "TODO-BASIC" "Casual lang" "Gotta pick up the kids" "add" "requires_title"
test_qa 13 "TODO-BASIC" "Formal" "Submit expense reimbursement form" "add" "requires_title"
test_qa 14 "TODO-BASIC" "Short" "Fix sink" "add" "requires_title"
test_qa 15 "TODO-BASIC" "Long desc" "Research and compare different health insurance plans for family coverage" "add" "requires_title"
test_qa 16 "TODO-BASIC" "Question form" "Can you remind me to backup my computer?" "add" "requires_title"
test_qa 17 "TODO-BASIC" "Multiple verbs" "Write and send thank you notes" "add" "requires_title"
test_qa 18 "TODO-BASIC" "With location" "Drop off package at post office" "add" "requires_title"
test_qa 19 "TODO-BASIC" "Tech task" "Update software on laptop" "add" "requires_title"
test_qa 20 "TODO-BASIC" "Social" "Text Sarah about dinner plans" "add" "requires_title"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏰ SECTION 2: TODO WITH TIME - PARSING (20 questions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_qa 21 "TODO-TIME" "Tomorrow" "Call mom tomorrow" "add" "requires_datetime"
test_qa 22 "TODO-TIME" "Tomorrow + time" "Meeting at 3pm tomorrow" "add" "requires_datetime"
test_qa 23 "TODO-TIME" "Next week" "Review document next Tuesday" "add" "requires_datetime"
test_qa 24 "TODO-TIME" "Specific date" "Submit report on January 20th" "add" "requires_datetime"
test_qa 25 "TODO-TIME" "This morning" "Send email this morning" "add" "requires_datetime"
test_qa 26 "TODO-TIME" "This afternoon" "Call client this afternoon" "add" "requires_datetime"
test_qa 27 "TODO-TIME" "Tonight" "Finish homework tonight" "add" "requires_datetime"
test_qa 28 "TODO-TIME" "This evening" "Cook dinner this evening" "add" "requires_datetime"
test_qa 29 "TODO-TIME" "Next Monday" "Start new project next Monday" "add" "requires_datetime"
test_qa 30 "TODO-TIME" "Next Friday" "Submit timesheet next Friday" "add" "requires_datetime"

test_qa 31 "TODO-TIME" "In 2 hours" "Follow up in 2 hours" "add" ""
test_qa 32 "TODO-TIME" "Later today" "Review report later today" "add" ""
test_qa 33 "TODO-TIME" "End of week" "Finish proposal by end of week" "add" ""
test_qa 34 "TODO-TIME" "Monday morning" "Team meeting Monday morning" "add" "requires_datetime"
test_qa 35 "TODO-TIME" "Friday evening" "Happy hour Friday evening" "add" "requires_datetime"
test_qa 36 "TODO-TIME" "Weekend" "Clean house this weekend" "add" ""
test_qa 37 "TODO-TIME" "Next month" "Plan vacation next month" "add" ""
test_qa 38 "TODO-TIME" "Specific time" "Call at 2:30pm tomorrow" "add" "requires_datetime"
test_qa 39 "TODO-TIME" "Morning time" "Gym session tomorrow at 6am" "add" "requires_datetime"
test_qa 40 "TODO-TIME" "Evening time" "Dinner reservation at 7:30pm tonight" "add" "requires_datetime"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚨 SECTION 3: PRIORITY & URGENCY (10 questions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_qa 41 "PRIORITY" "Urgent keyword" "Urgent - call lawyer today" "add" "should_be_high_priority"
test_qa 42 "PRIORITY" "Important keyword" "This is important - review contract" "add" "should_be_high_priority"
test_qa 43 "PRIORITY" "ASAP keyword" "Need to submit form ASAP" "add" "should_be_high_priority"
test_qa 44 "PRIORITY" "Critical keyword" "Critical - fix production bug" "add" "should_be_high_priority"
test_qa 45 "PRIORITY" "Priority explicit" "High priority: respond to client email" "add" "should_be_high_priority"
test_qa 46 "PRIORITY" "Deadline stress" "Must finish by end of day" "add" "should_be_high_priority"
test_qa 47 "PRIORITY" "Exclamation" "Pay rent today!" "add" "should_be_high_priority"
test_qa 48 "PRIORITY" "Time pressure" "Meeting in 30 minutes - print docs" "add" "should_be_high_priority"
test_qa 49 "PRIORITY" "Boss request" "Boss needs report immediately" "add" "should_be_high_priority"
test_qa 50 "PRIORITY" "Emergency" "Emergency - pet needs vet" "add" "should_be_high_priority"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📅 SECTION 4: APPOINTMENTS (15 questions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_qa 51 "APPOINTMENT" "Doctor" "Doctor appointment tomorrow at 10am" "add" "requires_datetime"
test_qa 52 "APPOINTMENT" "Dentist" "Dentist next Tuesday at 2pm" "add" "requires_datetime"
test_qa 53 "APPOINTMENT" "Meeting" "Client meeting Wednesday at 3pm" "add" "requires_datetime"
test_qa 54 "APPOINTMENT" "Interview" "Job interview Friday at 11am" "add" "requires_datetime"
test_qa 55 "APPOINTMENT" "Coffee" "Coffee with John tomorrow morning" "add" "requires_datetime"
test_qa 56 "APPOINTMENT" "Lunch" "Lunch meeting at noon Thursday" "add" "requires_datetime"
test_qa 57 "APPOINTMENT" "Call scheduled" "Conference call at 4pm today" "add" "requires_datetime"
test_qa 58 "APPOINTMENT" "Haircut" "Haircut appointment Saturday at 1pm" "add" "requires_datetime"
test_qa 59 "APPOINTMENT" "Vet" "Take dog to vet Monday at 9am" "add" "requires_datetime"
test_qa 60 "APPOINTMENT" "Parent-teacher" "Parent-teacher conference next week" "add" ""

test_qa 61 "APPOINTMENT" "Multiple people" "Meeting with Sarah and Tom at 2pm tomorrow" "add" "requires_datetime"
test_qa 62 "APPOINTMENT" "With location" "Dinner at Italian restaurant at 7pm Friday" "add" "requires_datetime"
test_qa 63 "APPOINTMENT" "Video call" "Zoom call with team at 10am Monday" "add" "requires_datetime"
test_qa 64 "APPOINTMENT" "Ambiguous" "Meeting with boss" "respond" ""
test_qa 65 "APPOINTMENT" "No time given" "Appointment with accountant this week" "respond" ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 SECTION 5: ROUTINES & RECURRING (10 questions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_qa 66 "ROUTINE" "Daily habit" "Meditate every morning" "add" ""
test_qa 67 "ROUTINE" "Weekly task" "Grocery shopping every Sunday" "add" ""
test_qa 68 "ROUTINE" "Gym routine" "Go to gym every Monday, Wednesday, Friday" "add" ""
test_qa 69 "ROUTINE" "Weekly meeting" "Team standup every weekday at 9am" "add" ""
test_qa 70 "ROUTINE" "Bi-weekly" "Pay bills every other Friday" "add" ""
test_qa 71 "ROUTINE" "Monthly" "Review budget first of each month" "add" ""
test_qa 72 "ROUTINE" "Weekend chore" "Laundry every weekend" "add" ""
test_qa 73 "ROUTINE" "Evening habit" "Read before bed every night" "add" ""
test_qa 74 "ROUTINE" "Work routine" "Check emails every morning at 8am" "add" ""
test_qa 75 "ROUTINE" "Exercise" "Yoga class every Tuesday evening" "add" ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛒 SECTION 6: GROCERY LOGIC (10 questions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_qa 76 "GROCERY" "Explicit add" "Add milk to grocery list" "add" ""
test_qa 77 "GROCERY" "Multiple items" "Add bread, eggs, and butter to grocery list" "add" ""
test_qa 78 "GROCERY" "Single item" "Put bananas on grocery list" "add" ""
test_qa 79 "GROCERY" "Task not item" "Go to grocery store tomorrow" "add" ""
test_qa 80 "GROCERY" "Pick up task" "Pick up dry cleaning" "add" ""
test_qa 81 "GROCERY" "Ambiguous" "Need to get tomatoes" "add" ""
test_qa 82 "GROCERY" "Specific brand" "Buy Oatly oat milk" "add" ""
test_qa 83 "GROCERY" "Quantity" "Get 2 dozen eggs" "add" ""
test_qa 84 "GROCERY" "Store task" "Stop by Whole Foods after work" "add" ""
test_qa 85 "GROCERY" "Shopping list" "Make shopping list for party" "add" ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💬 SECTION 7: CONVERSATIONAL (10 questions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_qa 86 "CONVERSATION" "Morning greeting" "Good morning" "respond" ""
test_qa 87 "CONVERSATION" "Daily overview" "What's on my schedule today?" "respond" ""
test_qa 88 "CONVERSATION" "Tomorrow query" "What do I have tomorrow?" "respond" ""
test_qa 89 "CONVERSATION" "Week ahead" "What's my week look like?" "respond" ""
test_qa 90 "CONVERSATION" "Todo list" "Show me my todos" "respond" ""
test_qa 91 "CONVERSATION" "Appointments" "What appointments do I have?" "respond" ""
test_qa 92 "CONVERSATION" "Free time" "Am I free Thursday afternoon?" "respond" ""
test_qa 93 "CONVERSATION" "Help request" "What can you help me with?" "respond" ""
test_qa 94 "CONVERSATION" "Capability" "What can you do?" "respond" ""
test_qa 95 "CONVERSATION" "Thank you" "Thanks for the help" "respond" ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 SECTION 8: EDGE CASES (5 questions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_qa 96 "EDGE" "Very long task" "Need to research, compare, and purchase a new laptop that has good battery life and can handle video editing software" "add" ""
test_qa 97 "EDGE" "Multiple tasks" "Add workout and meal prep to my list" "add" ""
test_qa 98 "EDGE" "Emoji in text" "Remember to 🎉 celebrate birthday" "add" ""
test_qa 99 "EDGE" "All caps" "URGENT CALL CLIENT" "add" ""
test_qa 100 "EDGE" "Mixed case" "ReMiNd Me To CaLl MoM" "add" ""

echo ""
echo "=================================================="
echo "📊 100-QUESTION POWER QA RESULTS"
echo "=================================================="
echo ""
echo "✅ Passed: $PASS_COUNT / $TOTAL_TESTS ($(( PASS_COUNT * 100 / TOTAL_TESTS ))%)"
echo "❌ Failed: $FAIL_COUNT / $TOTAL_TESTS"
echo "⚠️  Warnings: $WARN_COUNT / $TOTAL_TESTS"
echo ""

# Calculate grade
score=$(( PASS_COUNT * 100 / TOTAL_TESTS ))
if [ $score -ge 95 ]; then
    grade="A+ 🌟"
    status="ROCK SOLID"
elif [ $score -ge 90 ]; then
    grade="A 🎉"
    status="EXCELLENT"
elif [ $score -ge 85 ]; then
    grade="B+ ✅"
    status="VERY GOOD"
elif [ $score -ge 80 ]; then
    grade="B ✓"
    status="GOOD"
else
    grade="C ⚠️"
    status="NEEDS WORK"
fi

echo "Grade: $grade"
echo "Status: $status"
echo ""

if [ ${#ISSUES[@]} -gt 0 ]; then
    echo "🔴 CRITICAL ISSUES (${#ISSUES[@]}):"
    for issue in "${ISSUES[@]}"; do
        echo "  • $issue"
    done
    echo ""
fi

if [ ${#WARNINGS[@]} -gt 5 ]; then
    echo "⚠️  TOP WARNINGS (showing first 10):"
    for i in {0..9}; do
        if [ $i -lt ${#WARNINGS[@]} ]; then
            echo "  • ${WARNINGS[$i]}"
        fi
    done
    echo ""
fi

echo "Test completed at $(date)"
echo "=================================================="

# Save detailed results
cat > /Users/avpuser/HelpEm_POC/POWER_QA_RESULTS.txt <<EOF
100-Question Power QA Results
==========================================
Date: $(date)
API: $API_URL
Grade: $grade
Status: $status

Score: $PASS_COUNT / $TOTAL_TESTS ($(( PASS_COUNT * 100 / TOTAL_TESTS ))%)
Failed: $FAIL_COUNT
Warnings: $WARN_COUNT

Critical Issues: ${#ISSUES[@]}
$(for issue in "${ISSUES[@]}"; do echo "• $issue"; done)

Warnings: ${#WARNINGS[@]}
$(for warning in "${WARNINGS[@]}"; do echo "• $warning"; done)

Categories Tested:
✓ Section 1: Todo Creation - Basic (20 tests)
✓ Section 2: Todo with Time Parsing (20 tests)
✓ Section 3: Priority & Urgency (10 tests)
✓ Section 4: Appointments (15 tests)
✓ Section 5: Routines & Recurring (10 tests)
✓ Section 6: Grocery Logic (10 tests)
✓ Section 7: Conversational (10 tests)
✓ Section 8: Edge Cases (5 tests)

Next Steps:
$([ $score -ge 95 ] && echo "✓ Ship it! HelpEm is rock solid." || echo "• Review and address critical issues")
$([ ${#WARNINGS[@]} -gt 10 ] && echo "• Consider addressing warnings for optimal UX")

EOF

echo ""
echo "📄 Detailed results saved to POWER_QA_RESULTS.txt"
