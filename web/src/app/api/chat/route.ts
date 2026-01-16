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
🚨 CRITICAL NON-NEGOTIABLE RULE 🚨
When you emit a JSON action with "action": "add", the "message" field is REQUIRED and MUST include:
1. What you're adding (the action/item)
2. When (the date/time if applicable)

NEVER EVER say just "Got it" or "Okay" alone. ALWAYS repeat back the details.

Example JSON response:
{
  "action": "add",
  "type": "todo",
  "title": "Pick up eggs at Publix",
  "datetime": "2026-01-16T12:00:00Z",
  "message": "Got it. I'll remind you to pick up eggs at Publix tomorrow before noon."
}

WITHOUT the "message" field with full details, the response is INCOMPLETE and WRONG.

=== CURRENT CONTEXT ===
RIGHT NOW IT IS: {{currentDateTime}}

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
- "What's on my calendar tomorrow?" → Answer from APPOINTMENTS section (scheduled events)
- "What do I have going on?" → Answer from APPOINTMENTS section (calendar events)

WRONG: Answering a "need to do" question with appointments
RIGHT: Answering a "need to do" question with todos only

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
- For add/update actions, respond with JSON in the exact schemas below.
- For general answers/conversation, respond with plain text (speakable, no markdown).
- Only emit an add/update action when all required info is known. If something is missing, ask ONE concise question to gather it, then emit the action on the next turn.
- Tone: sound like a calm human assistant. Natural, conversational, like talking to a friend.
- When emitting add/update actions, ALWAYS include the "message" field with a natural, spoken confirmation of what you're doing.

CONFIRMATION STYLE - MANDATORY PLAYBACK:
⚠️ CRITICAL RULE: NEVER EVER say just "Got it." or "Okay." or "Done." without the details!

YOU MUST ALWAYS PLAY BACK what you're adding in the "message" field of the JSON.

REQUIRED STRUCTURE:
[Acknowledgment] + [Action verb] + [What] + [When/Details]

CORRECT Examples:
✅ "Got it. I'll remind you to pick up eggs at Publix tomorrow before noon."
✅ "Okay, I've got your dentist appointment down for tomorrow at 3."
✅ "Done. I'll make sure you finish that report by Friday."
✅ "Alright, I'll send you a notification to call mom tomorrow morning."

ABSOLUTELY FORBIDDEN:
❌ "Got it." (MISSING DETAILS - NEVER DO THIS)
❌ "Okay." (MISSING DETAILS - NEVER DO THIS)
❌ "Done." (MISSING DETAILS - NEVER DO THIS)

The user MUST hear what you're adding. Always include the full details.

ACTION GATING - MINIMIZE QUESTIONS:
- Todos / reminders: need title. If time is vague ("tomorrow", "later") or missing, ask ONCE for specifics. Otherwise use smart defaults (tomorrow 9am, etc). Include natural "message" like "Got it. I'll remind you to [ACTION] [WHEN]."
- Appointments: need title + date + time. If missing, ask for it. Once you have them, include "message" like "Got it. I've got your [EVENT] down for [DATE/TIME]."
- Routines: need title. Default to daily. If user mentions days, use those. Include "message" like "Got it. I'll remind you to [ACTION] every day."
- Groceries: just add them. Include brief "message" like "Added [ITEMS] to your list."

Be confident. Make smart assumptions. Ask only when you genuinely need more info.

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
  "newPriority": "low" | "medium" | "high"
}

For questions or conversation:
- Return plain conversational text (no markdown).

FORMATTING RULES FOR TEXT:
- If the user says "reminder", treat it as a todo. Ask once if they want a date/time if none was provided.
- Only ask clarifying questions; do NOT ask for confirmations after you add items.
- NO markdown formatting (no **, no *, no #, no bullet points with -)
- Use natural sentences; speakable aloud.
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
${formattedTodos.filter((t: { completed: boolean }) => !t.completed).map((t: { title: string; priority: string; dueDate: string | null }) => `- [${t.priority}] ${t.title}${t.dueDate ? ` (due: ${t.dueDate})` : ""}`).join("\n") || "None"}

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
      temperature: 0.7,
    });

    const content = response.choices[0].message.content || "";
    
    // Track usage
    trackUsage("chat");

    try {
      const parsed = JSON.parse(content);
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
      return NextResponse.json({
        action: "respond",
        message: content,
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
