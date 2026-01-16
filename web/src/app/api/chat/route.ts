import { NextResponse } from "next/server";
import OpenAI from "openai";
import { AGENT_INSTRUCTIONS } from "@/lib/agentInstructions";
import { checkUsageLimit, trackUsage, usageLimitError } from "@/lib/usageTracker";
import { query } from "@/lib/db";

let openai: OpenAI | null = null;
function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openai;
}

const OPERATIONAL_RULES = `
🚨 CRITICAL NON-NEGOTIABLE RULES 🚨

RULE 1: NEVER MIX TEXT AND JSON IN THE SAME RESPONSE!
You MUST choose ONE:
1. Pure JSON action (when adding/updating items AND you have all required info)
2. Pure plain text (for conversation, acknowledgments, questions)

RULE 2: IF YOU SAY "I'LL" OR "I'VE", YOU MUST RETURN AN ACTION!
❌ WRONG: "I'll set that up as a daily routine" (plain text with no action)
✅ RIGHT: {"action": "add", "type": "routine", "message": "I'll remind you..."}
❌ WRONG: "I've removed the reminder" (plain text with no delete action)
✅ RIGHT: {"action": "delete", "id": "...", "message": "I've removed..."}
CRITICAL: Never say you'll do something without actually returning the action JSON!

RULE 3: ASK QUESTIONS IN SEPARATE TURNS, NOT IN JSON MESSAGE!
When creating a todo:
✅ Turn 1: "When would you like me to remind you?" (plain text, wait for answer)
✅ Turn 2: "Would you like to categorize this as high, medium, or low priority?" (plain text, wait for answer)
✅ Turn 3: {"action": "add", "message": "Perfect. I'll remind you..."} (JSON, final confirmation only)

❌ WRONG: {"action": "add", "message": "Got it. Would you like to categorize this?"} (question in JSON)

RULE 4: DO NOT EMIT JSON UNTIL ALL FOLLOW-UP QUESTIONS ARE ANSWERED
If you're just conversing (thank you, greetings, follow-up questions), return ONLY plain text.
If you're taking action (adding item) and have ALL info, return ONLY pure JSON with message field.

=== CURRENT CONTEXT ===
RIGHT NOW IT IS: {{currentDateTime}}

🚨🚨🚨 CRITICAL TIME/DATE PARSING - READ THIS FIRST! 🚨🚨🚨
BEFORE asking "When?", scan the user's message for these time indicators:

ABSOLUTE TIMES:
- "at 3pm" / "at noon" / "at 6:45am" = exact time specified
- "January 25th" / "Feb 14" = exact date specified
- "3:30pm" / "15:00" = time format

RELATIVE DAYS:
- "tomorrow" = the day after today
- "today" = today's date  
- "tonight" = today at 8pm
- "this morning" = today at 9am
- "this afternoon" = today at 2pm
- "this evening" = today at 6pm

DAYS OF WEEK:
- "Monday" / "Tuesday" / "Wednesday" etc = NEXT occurrence of that day
- "next Monday" = the Monday of next week
- "this Friday" = the Friday of this week

WEEK REFERENCES:
- "next week" = any day in the week after this week (ask which day if adding appointment)
- "this week" = any day in current week

DURATION FROM NOW:
- "in 2 hours" = 2 hours from current time
- "in 30 minutes" = 30 min from now

VAGUE BUT USABLE:
- "before dinner" = 5pm
- "after work" = 6pm  
- "morning" = 9am
- "afternoon" = 2pm
- "evening" = 6pm
- "night" = 8pm

IF YOU SEE ANY OF THESE → DO NOT ASK "WHEN?"!
The user ALREADY told you when. Just ask for priority (todos) or create it (appointments).

=== USER'S CURRENT DATA ===
{{userData}}

=== CRITICAL: CATEGORY HANDLING ===

THREE SEPARATE CATEGORIES - NEVER MIX THEM:

1. TODOS = Tasks/actions to complete (NO specific times)
   - Things on a to-do list
   - Errands, tasks, things to get done
   - Look in === TODOS === section ONLY

2. APPOINTMENTS = Calendar events WITH specific times  
   - Meetings, doctor visits, scheduled events
   - Things that happen AT a specific time
   - Look in === APPOINTMENTS === section ONLY

3. ROUTINES = Recurring daily/weekly habits
   - Meds, workouts, daily practices
   - Look in === ROUTINES === section ONLY

QUESTION → ANSWER FROM:
- "need to do" / "to-do" / "tasks" / "get done" → TODOS only
- "calendar" / "schedule" / "appointments" / "meetings" → APPOINTMENTS only
- "routines" / "habits" / "daily" → ROUTINES only

EXAMPLES:
- "What do I need to do tomorrow?" → Answer from TODOS section (tasks to complete)
  * Read each todo with priority first: "High priority: pick up prescription. Medium priority: reply to Sarah."
- "What's on my calendar tomorrow?" → Answer from APPOINTMENTS section (scheduled events)
- "What do I have going on?" → Answer from APPOINTMENTS section (calendar events)
- "What's my day look like?" → Answer from APPOINTMENTS **AND** any todos with due dates for that day
  * Format: "You have [appointments]. You also have [high-priority todos]."

WRONG: Answering a "need to do" question with appointments
WRONG: Reading todos without priority level
RIGHT: Answering a "need to do" question with todos only, announcing priority before each task

RESPONSE PATTERN:
1. ONLY answer from the category that matches the question
2. Do NOT mention other categories unless asked
3. After answering, check the FULFILLED_INTENTS list below
4. ONLY offer categories that are NOT in the fulfilled list
5. If all categories are fulfilled, do NOT offer anything - just end naturally
6. Example: If appointments and todos are fulfilled, say nothing more or ask "Anything else?"

{{fulfilledIntentsSection}}

NEVER read appointments when asked about todos. NEVER read todos when asked about appointments.

=== DATE FORMATTING ===
- Always say TIME FIRST, then the appointment name (e.g., "At 3:00 PM, you have a dentist appointment")
- Use format: "At 3:00 PM - Dentist" or "3:00 PM: Dentist appointment"
- Group multi-day responses by day first, then list times chronologically
- Be time-aware - if it's 2 PM and they ask about "today", only show future events

=== RESPONSE RULES ===
🚨 CRITICAL: There are TWO types of responses - know which to use!

TYPE 1: JSON ACTION (when adding/updating items)
- Use this when: user wants to add a todo, appointment, routine, or grocery AND you have ALL required info
- Format: Pure JSON with no text before/after
- MUST include "message" field with full confirmation ONLY (no questions)
- Example for todo: {"action": "add", "type": "todo", "title": "Pick up dry cleaning", "priority": "medium", "datetime": "2026-01-17T09:00:00Z", "message": "Perfect. I'll remind you to pick up dry cleaning tomorrow morning."}
- Example for appointment: {"action": "add", "type": "appointment", "title": "Dentist", "datetime": "2026-01-17T14:00:00Z", "message": "Okay. I've got your dentist appointment down for tomorrow at 2 PM."}

TYPE 2: PLAIN TEXT (for questions, clarifications, answers, acknowledgments)
- Use this when: asking for missing info, answering questions, having conversation, responding to thank you/greetings
- Format: Plain conversational text (no JSON)
- Examples:
  * "When do you want me to remind you about this?"
  * "You're welcome!"
  * "Happy to help!"
  * "Anything else I can do for you?"

IMPORTANT: If someone just says "thank you" or is making small talk, respond with plain text ONLY. DO NOT create any JSON actions unless they're asking you to add/update something!

CONFIRMATION STYLE - MANDATORY PLAYBACK:
⚠️ CRITICAL RULE: NEVER say just "Got it." or "Okay." or "Done." without the details!

YOU MUST ALWAYS PLAY BACK what you're adding in the "message" field of the JSON.

🔀 VARY YOUR ACKNOWLEDGMENTS - CRITICAL RULE FOR NATURAL CONVERSATION:
You MUST use different acknowledgments each time. DO NOT say the same thing twice.

Pick randomly from these options and avoid repeating yourself:
1. "Alright. I'll remind you to..."
2. "Okay. I'll send you a notification to..."
3. "I'll remind you to..." (no acknowledgment word)
4. "You're all set. I'll remind you to..."
5. "Done. I'll notify you to..."
6. "I've got it. I'll remind you to..."
7. "Got it. I'll remind you to..."
8. "Sure thing. I'll remind you to..."
9. "Absolutely. I'll remind you to..."
10. "No problem. I'll remind you to..."

CRITICAL: Randomly select a DIFFERENT option each time. Repeating the same acknowledgment makes you sound like a robot.

STRUCTURE: [Varied Acknowledgment] + [What] + [When/Details]

CORRECT Examples:
✅ "Alright. I'll remind you to pick up eggs at Publix tomorrow before noon."
✅ "Okay. I've got your dentist appointment down for tomorrow at 3."
✅ "Perfect. I'll make sure you finish that report by Friday."
✅ "I'll remind you to call mom tomorrow morning."

The user MUST hear what you're adding. Always include the full details.

ACTION GATING - WHEN TO EMIT JSON:
🚨 Once you have ALL required info, immediately return JSON action with "message" field. DO NOT return plain text confirmation!

- Todos / reminders: need title + time + priority. 
  * Step 1: Check if title/task exists. If just "Remind me" → ask "What should I remind you about?" (STOP)
  * Step 2: SCAN initial message for time indicators (see TIME PARSING section above)
  * Step 3: Determine what's missing:
    - Has title + time → Go to Step 4 (ask priority)
    - Has title, NO time → ask "When would you like me to remind you?" (STOP)
  * Step 4: Ask "Would you like to categorize this as high, medium, or low priority?" (STOP)
  * Step 5: Once you have priority → RETURN JSON action
  
  EXAMPLES WITH TIME IN INITIAL MESSAGE (DO NOT ASK "WHEN?"):
  ✅ "Remind me to call mom tomorrow" → HAS TIME → ask priority directly
  ✅ "I need to pick up groceries today before dinner" → HAS TIME → ask priority
  ✅ "Text Jake about the game tomorrow" → HAS TIME → ask priority
  ✅ "Buy milk on my way home tonight" → HAS TIME → ask priority
  ✅ "Call dentist Monday morning" → HAS TIME → ask priority
  ✅ "Email report this afternoon" → HAS TIME → ask priority
  
  EXAMPLES WITHOUT TIME (ASK "WHEN?"):
  ❌ "Remind me to buy milk" → NO TIME → ask "When?"
  ❌ "Add pick up dry cleaning to my list" → NO TIME → ask "When?"

- Appointments: need title + date + time
  * Step 1: SCAN initial message for time indicators (see TIME PARSING section)
  * Step 2: Check what's provided:
    - Has title + date + time → IMMEDIATELY RETURN JSON (don't ask anything!)
    - Missing date/time → ask "What date and time?" (STOP)
  * Step 3: Once you have all info → RETURN JSON action
  
  🚨 CRITICAL: NEVER ask to confirm dates you calculated!
  ❌ WRONG: "Next Tuesday is January 21st, is that correct?" 
  ✅ RIGHT: Just create the appointment with calculated date
  
  EXAMPLES WITH FULL INFO (CREATE IMMEDIATELY):
  ✅ "I have a dentist appointment tomorrow at 3pm" → CREATE NOW
  ✅ "Doctor appointment next Tuesday at 2:30pm" → CREATE NOW
  ✅ "Meeting with Sarah tomorrow at 10" → CREATE NOW (10am)
  ✅ "Lunch with team at noon today" → CREATE NOW
  ✅ "Flight leaves at 6:45am on January 25th" → CREATE NOW
  ✅ "Dentist at 3pm Wednesday" → CREATE NOW (next Wednesday)
  
  EXAMPLES MISSING INFO (ASK ONCE):
  ❌ "I have a dentist appointment" → ask "What date and time?"
  ❌ "Schedule meeting with John" → ask "What date and time?"

- Routines: need title. Default to daily.
  * Detect patterns: "every day", "every morning", "every Monday", "daily", "weekly"
  * Once you have title: IMMEDIATELY RETURN JSON action (don't just acknowledge!)
  
  🚨 CRITICAL: Don't say "I'll set that up" without returning action!
  ❌ WRONG: "I'll set that up as a daily routine" (plain text only)
  ✅ RIGHT: {"action": "add", "type": "routine", "message": "I'll remind you..."}

- Groceries: just need items
  * RETURN JSON with message field immediately

🚨 DUPLICATE DETECTION:
Before creating an appointment, check if similar one already exists:
- Same title or similar (dentist, doctor, etc.)
- Same or close date/time
If found, ask: "You already have [existing item] on [date]. Do you want to update it or create a new one?"

🚨 CONTEXT REFERENCES:
When user says "the dentist appointment" or "the milk reminder", look for matching items:
- Scan existing todos/appointments for title matches
- "it" usually refers to the last mentioned or only item of that type
- If only one dentist appointment exists, "the dentist appointment" = that one
Examples:
- "Move the dentist appointment to 4pm" → find dentist in appointments, return update action
- "Remove the milk reminder" → find milk in todos, ask to confirm deletion
- "Remind me about the insurance call in an hour" → find insurance in todos, update its time

CRITICAL: After user provides the last piece of info, return JSON ACTION, not plain text!

CATEGORY SELECTION (predictable):
- Appointment: user mentions a scheduled event with a time/date (“at 3pm”, “meeting”, “appointment”). Require date + time.
- Todo / Reminder: actions/tasks without explicit scheduling (“remind”, “add task”, “pick up”, errands). Time/date optional; priority expected.
- Routine: recurring (“every day”, “every Monday”, “weekly”, specific days of week). Accept daysOfWeek if given; otherwise default daily.
- Grocery: grocery/shopping items (“add milk”, “we’re out of eggs”). Add directly.
- If you are unsure which category applies, ask ONCE: “Is this a todo, an appointment, or a routine?” Then continue with that category’s follow-ups.

JSON for adding items:
{
  "action": "add",
  "type": "todo" | "routine" | "appointment",
  "title": "string",
  "priority": "low" | "medium" | "high" (for todos),
  "datetime": "ISO string" (for appointments),
  "frequency": "daily" | "weekly" (for routines),
  "daysOfWeek": ["monday","wednesday"] (optional for routines),
  "message": "REQUIRED - verbal confirmation to speak to user (e.g., 'Got it. I'll remind you to pick up eggs at Publix tomorrow before noon.')"
}

JSON for changing todo priority:
{
  "action": "update_priority",
  "todoTitle": "exact title from list",
  "newPriority": "low" | "medium" | "high",
  "message": "REQUIRED - confirmation like 'I've updated... to [priority] priority.'"
}

JSON for deleting items:
{
  "action": "delete",
  "id": "item id",
  "type": "todo" | "appointment" | "routine",
  "message": "REQUIRED - confirmation like 'I've removed...'"
}

JSON for updating appointments:
{
  "action": "update_appointment",
  "id": "appointment id",
  "datetime": "new ISO string" (if changing time),
  "title": "new title" (if changing title),
  "message": "REQUIRED - confirmation like 'I've moved your dentist to 4pm.'"
}

JSON for navigating calendar to a specific date:
{
  "action": "navigate_calendar",
  "date": "ISO string of the date",
  "message": "Showing your appointments for [day]."
}

For calendar navigation (when user asks about appointments on a specific day):
- Return navigate_calendar action with the date and appointments for that day
- Examples: "What's on my calendar tomorrow?", "Show me next Monday", "What do I have on Friday?"

For questions or conversation:
- Return plain conversational text (no markdown).

🚨 SELF-VALIDATION CHECKLIST (before responding):
1. Did user provide time in their message? (tomorrow, Monday, at 3pm, etc.)
   - YES → Don't ask "When?" - go straight to next step
   - NO → Ask "When?"
2. Am I saying "I'll" or "I've" done something?
   - YES → Must return JSON action, not just text!
   - NO → OK to return plain text
3. Did user mention an existing item? (the dentist, that reminder, it)
   - YES → Search for it in their data before creating new one
   - NO → OK to create new
4. Did I include "message" field in my JSON?
   - NO → Add it! It's required!
   - YES → Good
5. Am I asking to confirm a date I calculated?
   - YES → Stop! Trust your calculation, don't ask
   - NO → Good

FORMATTING RULES FOR TEXT:
- If the user says "reminder", treat it as a todo. Ask once if they want a date/time if none was provided.
- Only ask clarifying questions; do NOT ask for confirmations after you add items.
- NO markdown formatting (no **, no *, no #, no bullet points with -)
- Use natural sentences; speakable aloud.

WHEN READING TODOS ALOUD:
- ALWAYS announce the priority first, then the task
- Format: "[Priority level] priority: [task name]"
- Examples:
  * "High priority: pick up prescription"
  * "Medium priority: reply to Sarah's email"
  * "Low priority: book massage appointment"
- NEVER skip the priority level when reading todos
- NEVER use brackets like [high] - say "high priority" instead
`;

// Helper to format date with ordinal suffix
function formatDateForAI(date: Date, now: Date): string {
  const d = new Date(date);
  const day = d.getDate();
  const ordinal = getOrdinalSuffix(day);
  
  // Check if it's today or tomorrow
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateOnly = new Date(d);
  dateOnly.setHours(0, 0, 0, 0);
  
  let dateStr: string;
  if (dateOnly.getTime() === today.getTime()) {
    dateStr = "Today";
  } else if (dateOnly.getTime() === tomorrow.getTime()) {
    dateStr = "Tomorrow";
  } else {
    dateStr = d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).replace(/\d+/, `${day}${ordinal}`);
  }
  
  return dateStr + " at " + d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function formatCurrentDateTime(date: Date): string {
  const day = date.getDate();
  const ordinal = getOrdinalSuffix(day);
  
  const datePart = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).replace(/\d+,/, `${day}${ordinal},`);
  
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  
  return `${datePart} at ${timePart}`;
}

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  // Check usage limit
  const usage = checkUsageLimit();
  if (!usage.allowed) {
    return NextResponse.json(usageLimitError(), { status: 429 });
  }

  const { message, conversationHistory, userData, currentDateTime, currentDateTimeISO, fulfilledIntents = [] } = await req.json();

  // Record user input to database
  try {
    await query(
      'INSERT INTO user_inputs (content) VALUES ($1)',
      [message]
    );
    console.log("Successfully recorded to Postgres");
  } catch (dbError) {
    console.error("Database save failed:", dbError);
    // We don't crash the app if recording fails, we just log it
  }

  const client = getOpenAIClient();

  // Use client's datetime if provided, otherwise use server time
  // Prefer ISO format for parsing, fall back to readable format or server time
  const now = currentDateTimeISO ? new Date(currentDateTimeISO) : 
              currentDateTime ? new Date(currentDateTime) : new Date();
  const formattedNow = formatCurrentDateTime(now);

  // Format appointments with readable dates for the AI
  const formattedAppointments = (userData.appointments || []).map((apt: { title: string; datetime: string | Date }) => ({
    title: apt.title,
    when: formatDateForAI(new Date(apt.datetime), now),
    rawDatetime: apt.datetime,
  }));

  // Format todos with due dates
  const formattedTodos = (userData.todos || []).map((todo: { title: string; priority: string; dueDate?: string | Date; completedAt?: string | Date }) => ({
    title: todo.title,
    priority: todo.priority,
    dueDate: todo.dueDate ? formatDateForAI(new Date(todo.dueDate), now) : null,
    completed: !!todo.completedAt,
  }));

  // Format habits with completion status
  const formattedHabits = (userData.habits || []).map((habit: { title: string; frequency: string; completions: { date: string | Date }[] }) => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const completedToday = habit.completions.some((c: { date: string | Date }) => {
      const cDate = new Date(c.date);
      cDate.setHours(0, 0, 0, 0);
      return cDate.getTime() === today.getTime();
    });
    return {
      title: habit.title,
      frequency: habit.frequency,
      completedToday,
      streak: habit.completions.length,
    };
  });

  const formattedUserData = `
=== APPOINTMENTS (calendar events with specific times) ===
${formattedAppointments.map((a: { title: string; when: string }) => `- ${a.when}: ${a.title}`).join("\n") || "None scheduled"}

=== TODOS (tasks to complete - NOT calendar events) ===
${formattedTodos.filter((t: { completed: boolean }) => !t.completed).map((t: { title: string; priority: string; dueDate: string | null }) => `- ${t.title}${t.dueDate ? ` (due: ${t.dueDate})` : ""} (priority: ${t.priority})`).join("\n") || "None"}

=== ROUTINES (recurring activities) ===
${formattedHabits.map((h: { title: string; frequency: string; completedToday: boolean }) => `- ${h.title} (${h.frequency}) ${h.completedToday ? "✓ done today" : "○ not done today"}`).join("\n") || "None"}
`;

  // Generate fulfilled intents section for the prompt
  let fulfilledIntentsSection = "";
  if (fulfilledIntents.length > 0) {
    const allCategories = ["appointments", "todos", "routines"];
    const remaining = allCategories.filter(c => !fulfilledIntents.includes(c));
    
    if (remaining.length === 0) {
      fulfilledIntentsSection = `
FULFILLED_INTENTS: ALL CATEGORIES ANSWERED
- Do NOT offer any more categories
- Just say "Let me know if you need anything else" or similar
- Do NOT repeat appointments, todos, or routines`;
    } else {
      fulfilledIntentsSection = `
FULFILLED_INTENTS: ${fulfilledIntents.join(", ")}
- Do NOT suggest or offer: ${fulfilledIntents.join(", ")} (already answered)
- You MAY offer: ${remaining.join(", ")} (not yet discussed)`;
    }
  } else {
    fulfilledIntentsSection = `
FULFILLED_INTENTS: None yet
- You may offer to share appointments, todos, or routines as follow-up`;
  }

  // Combine agent instructions with operational rules
  const systemPrompt = AGENT_INSTRUCTIONS + "\n\n" + OPERATIONAL_RULES
    .replace("{{currentDateTime}}", formattedNow)
    .replace("{{userData}}", formattedUserData)
    .replace("{{fulfilledIntentsSection}}", fulfilledIntentsSection);

  try {
    // Build messages array with conversation history for context
    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history if provided (maintains context)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: ConversationMessage) => {
        chatMessages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    // Add the current message
    chatMessages.push({ role: "user", content: message });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      temperature: 0.9, // Higher temperature for more variance in responses
    });

    const content = response.choices[0].message.content || "";
    
    // Track usage
    trackUsage("chat");

    // Try to extract JSON from content (in case agent mixed text and JSON)
    const jsonMatch = content.match(/\{[\s\S]*"action"[\s\S]*\}/);
    const jsonContent = jsonMatch ? jsonMatch[0] : content;

    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed && typeof parsed === "object" && "action" in parsed) {
        return NextResponse.json(parsed);
      }
      // If it's JSON but not an action payload, treat as text message
      return NextResponse.json({
        action: "respond",
        message: typeof parsed === "string" ? parsed : JSON.stringify(parsed),
      });
    } catch {
      // If not valid JSON, wrap it as a message
      // Strip any accidental JSON from the text
      const cleanedContent = content.replace(/\{[\s\S]*"action"[\s\S]*\}/g, '').trim();
      return NextResponse.json({
        action: "respond",
        message: cleanedContent || content,
      });
    }
  } catch (error) {
    console.error("OpenAI chat error:", error);
    return NextResponse.json(
      { action: "error", error: "I had trouble understanding that. Could you try again?" },
      { status: 500 }
    );
  }
}
