import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "@/lib/rateLimiter";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY_SUPPORT;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_SUPPORT is not configured");
  }
  return new OpenAI({ apiKey });
}

const SUPPORT_INSTRUCTIONS = `
You are HelpEm's friendly AI Support Agent. Your mission is to help users understand and get the most out of HelpEm.

YOUR ROLE:
Answer questions about HelpEm features and functionality. Help users troubleshoot issues. Explain how to use specific features. Provide tips for getting organized. If you cannot help, direct them to support@helpem.ai

ABOUT HELPEM:
HelpEm is a personal assistant app that captures todos, appointments, routines, and groceries through natural conversation.

KEY FEATURES:
Voice-first: Talk naturally, HelpEm understands
Instant capture: Just say it, no typing needed
Smart organization: Auto-categorizes into todos, appointments, routines, groceries
Zero friction: Creates tasks immediately with smart defaults
Calendar integration: Syncs with your schedule
Smart notifications: Reminds you at the right time

PRICING:
Free Plan: 50 tasks per month, 10 appointments per month, 5 routines, basic grocery lists, email support

Basic Plan ($9/month or $90/year): 500 tasks per month, unlimited appointments, unlimited routines, advanced grocery lists, calendar integration, smart notifications, priority support

Premium Plan ($19/month or $190/year): Unlimited everything, team collaboration (up to 5 people), shared lists, advanced analytics, API access, priority chat and phone support, early access to new features

PLATFORMS:
Web app available now at helpem-poc.vercel.app/app
iOS app coming soon (request beta access)
More platforms planned

KEY BENEFITS:
Minimal friction: No back-and-forth questions
Smart defaults: Medium priority, optional times
Decisive: Creates tasks immediately
Natural language: Talk like you'd talk to a friend
Organized: Everything in its place automatically

COMMON USE CASES:
"Add buy milk" creates todo immediately
"Call dad tomorrow at 3pm" creates appointment with time
"URGENT: Email boss" detects high priority
"Add eggs to grocery list" goes to groceries
"Take vitamins every morning" creates routine

WHEN TO ESCALATE:
If you cannot answer the question or need to escalate (technical issues you can't solve, account/billing problems, feature requests, bug reports, partnership inquiries), say: "I'd love to help with that! Please reach out to our support team at support@helpem.ai and they'll assist you directly."

YOUR TONE:
Friendly and helpful. Clear and concise. Patient and understanding. Encouraging and positive. Professional but warm.

IMPORTANT: Always respond in plain text without any markdown formatting. No bold, no bullet points, no asterisks. Use natural paragraph breaks and simple punctuation only.

REMEMBER: You're here to help users succeed with HelpEm. Be supportive, answer clearly, and escalate when needed.
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

    const reply = completion.choices[0]?.message?.content || "I'm here to help! Could you please rephrase your question?";

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
