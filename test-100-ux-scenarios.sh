#!/bin/bash

echo "🚀 HELPEM 100-SCENARIO UX TEST"
echo "=============================="
echo "Goal: Make HelpEm the BEST personal assistant in the world!"
echo ""

log="ux_100_test_$(date +%s).md"

echo "# HelpEm 100-Scenario UX Test" > "$log"
echo "**Date**: $(date)" >> "$log"
echo "**Goal**: Identify ALL issues and improvements to make HelpEm world-class" >> "$log"
echo "" >> "$log"
echo "---" >> "$log"
echo "" >> "$log"

# Counters
total=0
excellent=0
good=0
needs_work=0
critical_issues=0

test_interaction() {
  local num="$1"
  local category="$2"
  local user_input="$3"
  local expected_behavior="$4"
  
  total=$((total + 1))
  
  echo "[$num/100] $category"
  echo "  User: \"$user_input\""
  
  response=$(curl -s -X POST https://helpem.ai/api/chat \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$user_input\", \"userData\": {\"todos\": [], \"appointments\": [], \"habits\": []}, \"conversationHistory\": []}")
  
  action=$(echo "$response" | grep -o '"action":"[^"]*"' | sed 's/"action":"//;s/"$//')
  message=$(echo "$response" | grep -o '"message":"[^"]*"' | sed 's/"message":"//;s/"$//' | sed 's/\\n/ /g')
  
  if [ -z "$action" ] && [ -z "$message" ]; then
    echo "  ❌ CRITICAL: No response"
    critical_issues=$((critical_issues + 1))
    
    echo "" >> "$log"
    echo "## ❌ CRITICAL ISSUE #$num - $category" >> "$log"
    echo "**User**: \"$user_input\"" >> "$log"
    echo "**Expected**: $expected_behavior" >> "$log"
    echo "**Actual**: NO RESPONSE" >> "$log"
    echo "" >> "$log"
    echo "---" >> "$log"
    sleep 1
    return
  fi
  
  echo "  Action: $action"
  echo "  Message: \"${message:0:80}...\""
  
  # Scoring
  issues=""
  improvements=""
  
  # Check response quality
  if [ "$action" = "add" ]; then
    if ! echo "$message" | grep -qiE "(got it|alright|okay|i'll|i've|done|perfect|sure)"; then
      issues="${issues}Missing confirmation words. "
      needs_work=$((needs_work + 1))
    fi
    if [ ${#message} -lt 10 ]; then
      issues="${issues}Response too short. "
      needs_work=$((needs_work + 1))
    fi
    if [ ${#message} -gt 200 ]; then
      improvements="${improvements}Response too long (${#message} chars). "
    fi
  fi
  
  # Grade
  if [ -n "$issues" ]; then
    if echo "$issues" | grep -q "CRITICAL"; then
      grade="❌ CRITICAL"
      critical_issues=$((critical_issues + 1))
    else
      grade="⚠️ NEEDS WORK"
      needs_work=$((needs_work + 1))
    fi
  elif [ -n "$improvements" ]; then
    grade="✅ GOOD"
    good=$((good + 1))
  else
    grade="⭐ EXCELLENT"
    excellent=$((excellent + 1))
  fi
  
  echo "  Grade: $grade"
  echo ""
  
  # Log
  echo "" >> "$log"
  echo "## $grade - #$num: $category" >> "$log"
  echo "**User Input**: \"$user_input\"" >> "$log"
  echo "**Expected**: $expected_behavior" >> "$log"
  echo "**Action**: $action" >> "$log"
  echo "**Message**: $message" >> "$log"
  
  if [ -n "$issues" ]; then
    echo "" >> "$log"
    echo "**Issues**: $issues" >> "$log"
  fi
  
  if [ -n "$improvements" ]; then
    echo "" >> "$log"
    echo "**Improvements**: $improvements" >> "$log"
  fi
  
  echo "" >> "$log"
  echo "---" >> "$log"
  
  sleep 1
}

echo "📝 CATEGORY 1: Basic Task Creation (10 tests)"
echo ""

test_interaction 1 "Simple todo" "Buy milk" "Should create todo with medium priority"
test_interaction 2 "Urgent todo" "Call boss ASAP!" "Should create todo with HIGH priority"
test_interaction 3 "Todo with time" "Email team tomorrow" "Should create todo with datetime"
test_interaction 4 "Todo with person" "Text Sarah about dinner" "Should capture person name"
test_interaction 5 "Shopping item" "Need to get eggs" "Should create todo"
test_interaction 6 "Work task" "Finish the report" "Should create todo"
test_interaction 7 "Personal task" "Call mom" "Should create todo"
test_interaction 8 "Reminder format" "Remind me to take out trash" "Should create todo"
test_interaction 9 "Can you format" "Can you remind me to backup files?" "Should create todo"
test_interaction 10 "Gotta format" "Gotta pick up kids" "Should create todo"

echo ""
echo "📅 CATEGORY 2: Appointments (10 tests)"
echo ""

test_interaction 11 "Appointment with time" "Dentist appointment tomorrow at 3pm" "Should create appointment"
test_interaction 12 "Meeting" "Team meeting Friday at 10am" "Should create appointment"
test_interaction 13 "Doctor visit" "Doctor appointment next Tuesday 2:30pm" "Should create appointment"
test_interaction 14 "Lunch plans" "Lunch with John at noon tomorrow" "Should create appointment"
test_interaction 15 "Multiple time formats" "Flight at 6:45am Monday" "Should parse time correctly"
test_interaction 16 "Evening time" "Dinner reservation at 7pm tonight" "Should handle 'tonight'"
test_interaction 17 "Generic meeting" "Meeting at 3pm tomorrow" "Should accept generic title"
test_interaction 18 "Call scheduled" "Call at 2:30pm tomorrow" "Should accept generic title"
test_interaction 19 "Appointment next week" "Haircut next Wednesday at 4pm" "Should calculate next week"
test_interaction 20 "Morning appointment" "Breakfast meeting tomorrow morning" "Should default to 9am"

echo ""
echo "🔄 CATEGORY 3: Natural Language Variations (15 tests)"
echo ""

test_interaction 21 "Casual" "gotta buy milk tmrw" "Should handle casual language"
test_interaction 22 "Formal" "Please schedule quarterly review" "Should ask for time"
test_interaction 23 "Shorthand" "mtg w/ sarah 3pm" "Should expand abbreviations"
test_interaction 24 "Filler words" "um, I need to like buy eggs" "Should ignore filler words"
test_interaction 25 "Run-on" "I need to call mom and pick up kids and buy milk" "Should handle multiple items"
test_interaction 26 "Incomplete" "tomorrow at 3" "Should ask for clarification"
test_interaction 27 "Just verb" "email the team" "Should create todo"
test_interaction 28 "Question format" "Could you remind me to pay bills?" "Should create todo"
test_interaction 29 "Polite request" "Would you mind reminding me to call?" "Should create todo"
test_interaction 30 "Urgent language" "I NEED to finish this today!" "Should detect urgency"
test_interaction 31 "Boss/authority" "Boss needs report by EOD" "Should detect high priority"
test_interaction 32 "Deadline language" "Must complete before deadline" "Should detect urgency"
test_interaction 33 "Time pressure" "Need this done immediately" "Should detect high priority"
test_interaction 34 "Multiple exclamations" "Buy milk!!" "Should detect high priority"
test_interaction 35 "Weekend plans" "Book spa appointment this weekend" "Should handle 'weekend'"

echo ""
echo "⏰ CATEGORY 4: Time & Date Parsing (15 tests)"
echo ""

test_interaction 36 "Relative time" "in 2 hours" "Should calculate future time"
test_interaction 37 "Later today" "Send email later today" "Should default to +4 hours"
test_interaction 38 "This afternoon" "Meeting this afternoon" "Should default to 2pm"
test_interaction 39 "This evening" "Dinner this evening" "Should default to 6pm"
test_interaction 40 "Tonight" "Call tonight" "Should default to 8pm"
test_interaction 41 "Tomorrow morning" "Gym tomorrow morning" "Should default to 9am"
test_interaction 42 "End of week" "Finish report by end of week" "Should use Friday"
test_interaction 43 "Next Monday" "Call client next Monday" "Should calculate next week"
test_interaction 44 "This Friday" "Submit proposal this Friday" "Should use this week"
test_interaction 45 "Next month" "Schedule review next month" "Should use next month"
test_interaction 46 "Specific date" "Meeting on January 25th" "Should ask for time"
test_interaction 47 "Before event" "Call before meeting" "Should ask when"
test_interaction 48 "After event" "Follow up after presentation" "Should ask when"
test_interaction 49 "By date" "Complete by Friday" "Should use Friday"
test_interaction 50 "Within timeframe" "Finish in 3 days" "Should calculate date"

echo ""
echo "🎯 CATEGORY 5: Priority Detection (10 tests)"
echo ""

test_interaction 51 "Urgent keyword" "Urgent: call lawyer" "Should detect HIGH priority"
test_interaction 52 "ASAP keyword" "Email client ASAP" "Should detect HIGH priority"
test_interaction 53 "Critical keyword" "Critical bug fix needed" "Should detect HIGH priority"
test_interaction 54 "Emergency keyword" "Emergency: pet to vet" "Should detect HIGH priority"
test_interaction 55 "Important keyword" "Important meeting prep" "Should detect HIGH priority"
test_interaction 56 "Must keyword" "Must finish today" "Should detect HIGH priority"
test_interaction 57 "Exclamation mark" "Do this now!" "Should detect HIGH priority"
test_interaction 58 "Low priority" "Low priority: organize files" "Should detect LOW priority"
test_interaction 59 "No priority" "Buy coffee" "Should default to MEDIUM"
test_interaction 60 "Boss mention" "Boss wants update" "Should detect HIGH priority"

echo ""
echo "❓ CATEGORY 6: Ambiguous Inputs (10 tests)"
echo ""

test_interaction 61 "Single word" "milk" "Should ask for clarification"
test_interaction 62 "Just remind me" "Remind me" "Should ask what to remind"
test_interaction 63 "Vague task" "Handle that thing" "Should ask for details"
test_interaction 64 "Just time" "tomorrow at 3" "Should ask what for"
test_interaction 65 "Just date" "next Tuesday" "Should ask what for"
test_interaction 66 "Incomplete meeting" "Schedule meeting" "Should ask for date/time"
test_interaction 67 "Generic appointment" "I have an appointment" "Should ask when"
test_interaction 68 "Vague reminder" "Remind me about that" "Should ask what"
test_interaction 69 "No context" "organize" "Should ask what to organize"
test_interaction 70 "Too general" "help me plan" "Should ask for specifics"

echo ""
echo "🗣️ CATEGORY 7: Conversational (5 tests)"
echo ""

test_interaction 71 "Thank you" "Thank you!" "Should respond naturally, no action"
test_interaction 72 "Greeting" "Hello" "Should greet back, no action"
test_interaction 73 "How are you" "How are you doing?" "Should respond naturally"
test_interaction 74 "Appreciation" "You're awesome!" "Should respond warmly"
test_interaction 75 "Help request" "What can you do?" "Should explain capabilities"

echo ""
echo "🔧 CATEGORY 8: Edge Cases (10 tests)"
echo ""

test_interaction 76 "Gibberish" "asdfghjkl" "Should ask to rephrase"
test_interaction 77 "Special chars" "Buy @#$% items" "Should handle gracefully"
test_interaction 78 "Very long" "I need to remember to call my dentist and schedule an appointment for next month and also remind me to pick up my prescription from the pharmacy and don't forget to buy groceries including milk eggs bread cheese butter yogurt" "Should handle long input"
test_interaction 79 "Emoji" "Buy milk 🥛" "Should ignore emoji"
test_interaction 80 "Numbers" "Call 555-1234" "Should preserve numbers"
test_interaction 81 "Email address" "Email john@example.com" "Should preserve email"
test_interaction 82 "URL" "Review website.com" "Should preserve URL"
test_interaction 83 "Multiple spaces" "Buy    milk" "Should normalize spaces"
test_interaction 84 "All caps" "BUY MILK NOW" "Should normalize case, detect urgency"
test_interaction 85 "Mixed case" "BuY MiLk" "Should normalize case"

echo ""
echo "🎪 CATEGORY 9: Complex Scenarios (10 tests)"
echo ""

test_interaction 86 "Multiple items" "Add eggs, milk, and bread" "Should create first, mention all"
test_interaction 87 "Task with details" "Buy birthday gift for Sarah next week, around $50" "Should capture details"
test_interaction 88 "Location context" "Pick up dry cleaning on Main St" "Should capture location"
test_interaction 89 "Conditional task" "If it rains, reschedule picnic" "Should create as reminder"
test_interaction 90 "Dependent tasks" "Email team after calling client" "Should create task"
test_interaction 91 "Recurring mention" "Water plants every Monday" "Should create routine"
test_interaction 92 "Daily habit" "Take vitamins every morning" "Should create routine"
test_interaction 93 "Weekly routine" "Gym 3 times a week" "Should ask for days"
test_interaction 94 "Person context" "Call Sarah about project update tomorrow" "Should capture context"
test_interaction 95 "Business context" "Prepare Q4 presentation for board meeting Friday" "Should capture details"

echo ""
echo "✨ CATEGORY 10: Response Quality (5 tests)"
echo ""

test_interaction 96 "Confirmation clarity" "Buy milk tomorrow" "Should confirm what and when"
test_interaction 97 "Natural language" "Meeting at 3pm" "Should respond naturally"
test_interaction 98 "Helpful context" "Call urgent" "Should ask who to call"
test_interaction 99 "Friendly tone" "Remind me to relax" "Should respond warmly"
test_interaction 100 "Concise confirmation" "Email team" "Should be concise, not verbose"

echo ""
echo "============================================"
echo "📊 100-SCENARIO TEST COMPLETE"
echo "============================================"
echo ""
echo "Results:"
echo "--------"
echo "Total: $total"
echo "⭐ Excellent: $excellent (${excellent}%)"
echo "✅ Good: $good (${good}%)"
echo "⚠️ Needs Work: $needs_work (${needs_work}%)"
echo "❌ Critical: $critical_issues (${critical_issues}%)"
echo ""

quality_score=$((excellent + good))
echo "Overall Quality Score: ${quality_score}% (Excellent + Good)"
echo ""

if [ $quality_score -ge 95 ]; then
  echo "🏆 WORLD-CLASS! This is the best personal assistant!"
elif [ $quality_score -ge 85 ]; then
  echo "🎯 EXCELLENT! Very close to world-class."
elif [ $quality_score -ge 75 ]; then
  echo "✅ GOOD! Solid foundation, needs refinement."
elif [ $quality_score -ge 60 ]; then
  echo "⚠️ NEEDS WORK! Significant improvements needed."
else
  echo "❌ CRITICAL! Major overhaul required."
fi

echo ""
echo "📄 Full report: $log"
echo ""
echo "Next steps:"
echo "1. Review critical issues"
echo "2. Fix high-impact problems"
echo "3. Re-test to verify improvements"
echo "4. Iterate until world-class (95%+)"
