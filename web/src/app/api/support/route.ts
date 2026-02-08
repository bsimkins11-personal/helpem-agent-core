import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "@/lib/rateLimiter";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY_SUPPORT || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_SUPPORT is not configured");
  }
  return new OpenAI({ apiKey });
}

/**
 * Strip all markdown formatting from response
 * Ensures plain text only, no matter what AI returns
 */
function stripMarkdown(text: string): string {
  return text
    // Remove headers (## Title, ### Title)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold (**text** or __text__)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    // Remove italic (*text* or _text_)
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove bullet points (-, *, •)
    .replace(/^[\s]*[-*•]\s+/gm, '')
    // Remove numbered lists (1., 2.)
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove code blocks (```code```)
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code (`code`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove links [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove remaining asterisks and underscores
    .replace(/[*_]/g, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const SUPPORT_INSTRUCTIONS = `
You are helpem's AI Support Agent with deep product knowledge. Help users quickly and accurately.

=== CRITICAL FORMATTING RULES ===
ABSOLUTELY NO MARKDOWN EVER:
- NO headers (## or ###)
- NO bold (**text**)
- NO italics (*text*)
- NO bullet points (-, *, •)
- NO numbered lists
- NO code blocks
- NO links with brackets

USE ONLY: Plain sentences, periods, line breaks for separation. Natural conversation.

=== RESPONSE RULES ===
- Be concise: 50 words or less for simple questions, 100 words max for complex
- Be accurate: Use only verified info below
- Be decisive: If you can't help, escalate immediately to support@helpem.ai
- Be friendly: Warm, professional, encouraging

=== CURRENT STATUS: ALPHA ===
- Web app: Available NOW at helpem.ai on iOS and Android browsers
- Optional install: Add helpem to your home screen from mobile browsers
- Alpha limit: $2/month API (~1000 messages)
- Sign in: Web login and social sign-in on helpem.ai

=== CORE FEATURES ===
Voice Input:
Click microphone, speak naturally. Works on modern mobile and desktop browsers (Chrome/Safari/Edge). Uses OpenAI Whisper transcription + GPT-4 AI.

Task Creation:
Just say what you need in natural language. AI understands context. Examples: "Buy milk", "Call mom tomorrow", "Email team ASAP". Auto-creates with smart defaults.

Categories:
- Todos: Tasks without specific times (default medium priority)
- Appointments: Events with date/time (15-min advance notification)
- Routines: Recurring ("every morning", "every Monday")

Priority:
Say "urgent" or "ASAP" for high. Default is medium. Can explicitly say "low priority".

Time Parsing:
"tomorrow", "Monday", "next week", "at 3pm", "morning" all work. No time? That's fine - creates task without it.

Menu Features:
- Give Feedback (alpha feedback)
- View Usage (monthly limits)
- Get Support (that's you!)
- Clear All Data (deletes everything from database)
- Logout

Data Security:
Each user isolated, encrypted, and deletable anytime from menu.

=== PRICING ===
Alpha: FREE! Limited to $2/month API (~1000 messages)

Future Plans:
- Free: 50 tasks/month, 10 appointments/month, 5 routines, basic grocery lists, email support
- Basic $4.99/month: 500 tasks, unlimited appointments, calendar sync, priority email support
- Premium $9.99/month: Unlimited tasks, team collaboration (5 people), API access, priority support, analytics

API ACCESS:
Available in Premium plan only ($9.99/month). Lets developers integrate helpem into custom workflows. Documentation coming soon. To join API beta, email support@helpem.ai

=== QUICK ANSWERS ===
"How do I add a task?" → Just say or type it! Examples: "Buy milk", "Call mom tomorrow". Creates instantly.

"Can I use voice?" → Yes! Click microphone. Works on modern browsers (Chrome/Safari/Edge). Allow microphone permission.

"Voice not working?" → Check microphone permission, use Chrome/Safari/Edge, refresh page. Still broken? Email support@helpem.ai

"How do priorities work?" → Say "urgent" or "ASAP" for high. Default is medium.

"Todo vs appointment?" → Todos are tasks (no specific time). Appointments have date/time. AI auto-detects.

"Can I edit?" → Not yet. Delete and recreate for now. Editing coming soon!

"How do notifications work?" → Todos notify at set time. Appointments notify 15 min before. Browser permission is required.

"Where's my data?" → Secure encrypted database. Each user isolated. Delete anytime: Menu → Clear All Data.

"Can I export my data?" → Export feature coming soon! For now, email support@helpem.ai and we can manually export your data for you.

"Can I add tasks via API?" → Premium plan ($9.99/month) includes API access! Documentation coming soon. Email support@helpem.ai to join API beta.

=== ESCALATE IMMEDIATELY FOR ===
Billing, refunds, payments, account deletion, login failures, data loss, crashes, partnerships, enterprise pricing, data export requests, API beta access.

SECURITY VULNERABILITIES:
If user reports a security vulnerability, say: "URGENT: Please email security@helpem.ai immediately with details. Do NOT share publicly. Thank you for helping keep helpem secure!"

ESCALATION FORMAT:
"I'd love to help with that! Please email support@helpem.ai and our team will assist you directly."

Then STOP. Do not continue conversation.

=== EXAMPLES (CORRECT FORMAT) ===
Q: "How do I add a task?"
A: "Just say or type what you need to do! Examples: Buy milk, Call mom tomorrow, Email team. helpem creates it instantly."

Q: "Can I get a refund?"
A: "I'd love to help with that! Please email support@helpem.ai and our team will assist you directly."

Q: "It's not working"
A: "I want to help! What specifically isn't working? Voice input, task creation, login, or something else? The more details you give, the faster I can help!"

Q: "???"
A: "I'm here to help! Try asking: How does helpem work? How do I add a task? Does it work on iPhone? Or anything else you'd like to know!"

Q: "I found a security vulnerability"
A: "URGENT: Please email security@helpem.ai immediately with details. Do NOT share publicly. Thank you for helping keep helpem secure!"

Q: "Voice input isn't working"
A: "Let's troubleshoot! Check: 1) Microphone permission in browser, 2) Use Chrome/Safari/Edge, 3) Refresh page. Still broken? Email support@helpem.ai"

REMEMBER: Fast, accurate, concise. No markdown ever. For vague questions, ask clarifying questions FIRST before escalating. Escalate decisively when needed or when user can't be helped.
`;

export async function POST(request: NextRequest) {
  try {
    // 🛡️ RATE LIMITING - Protect against API abuse
    const clientIp = getClientIdentifier(request);
    const rateLimit = await checkRateLimit({
      ...RATE_LIMITS.SUPPORT,
      identifier: `support:${clientIp}`,
    });

    if (!rateLimit.allowed) {
      const resetDate = new Date(rateLimit.resetAt);
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later.",
          resetAt: resetDate.toISOString(),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": RATE_LIMITS.SUPPORT.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetDate.toISOString(),
            "Retry-After": Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Validate message length to prevent abuse
    if (message.length > 1000) {
      return NextResponse.json(
        { error: "Message too long (max 1000 characters)" },
        { status: 400 }
      );
    }

    // Limit conversation history to prevent token abuse
    const limitedHistory = conversationHistory.slice(-10); // Last 10 messages only

    const openai = getOpenAIClient();

    // Build conversation with support instructions
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: SUPPORT_INSTRUCTIONS,
      },
      ...limitedHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user",
        content: message,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const rawReply = completion.choices[0]?.message?.content || "I'm here to help! Could you please rephrase your question?";
    
    // Strip any markdown formatting to ensure plain text
    const reply = stripMarkdown(rawReply);

    return NextResponse.json(
      {
        message: reply,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "X-RateLimit-Limit": RATE_LIMITS.SUPPORT.maxRequests.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
        },
      }
    );

  } catch (error: unknown) {
    console.error("Support API error:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Failed to process support request", details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to process support request" },
      { status: 500 }
    );
  }
}
