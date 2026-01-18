import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "@/lib/rateLimiter";

export async function POST(request: NextRequest) {
  try {
    // 🛡️ Rate limiting - Prevent feedback spam
    const clientIp = getClientIdentifier(request);
    const rateLimit = await checkRateLimit({
      identifier: `feedback:${clientIp}`,
      maxRequests: 5, // 5 feedback submissions per hour
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many feedback submissions. Please try again later." },
        { status: 429 }
      );
    }

    // 🔐 Authentication - Optional but track user if authenticated
    const user = await getAuthUser(request);
    
    const body = await request.json();
    const { category, feedback, pageUrl } = body;

    // Validation
    if (!feedback || feedback.trim().length === 0) {
      return NextResponse.json(
        { error: "Feedback is required" },
        { status: 400 }
      );
    }

    if (feedback.length > 2000) {
      return NextResponse.json(
        { error: "Feedback must be less than 2000 characters" },
        { status: 400 }
      );
    }
    
    // Input sanitization - Remove potential script tags
    const sanitizedFeedback = feedback
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .trim();

    // Get credentials from environment
    const credentialsJson =
      process.env.GOOGLE_SHEETS_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!credentialsJson || !spreadsheetId) {
      console.error("Google Sheets credentials not configured", {
        hasCredentials: !!credentialsJson,
        hasSheetId: !!spreadsheetId,
      });
      return NextResponse.json(
        { error: "Feedback system not configured. Please email support@helpem.ai" },
        { status: 500 }
      );
    }

    const credentials = JSON.parse(credentialsJson);

    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Get user info - prefer authenticated user ID
    const userId = user?.userId || "anonymous";
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const sessionId = request.cookies.get("session_id")?.value || "unknown_session";

    // Prepare row data
    const timestamp = new Date().toISOString();
    const row = [
      timestamp,
      userId,
      "", // Email (not collected for privacy)
      category || "general",
      sanitizedFeedback, // Use sanitized feedback
      pageUrl || "",
      userAgent,
      sessionId,
    ];

    // Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:H", // Adjust if your sheet has a different name
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Thank you for providing feedback!",
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback. Please try again or email support@helpem.ai" },
      { status: 500 }
    );
  }
}
