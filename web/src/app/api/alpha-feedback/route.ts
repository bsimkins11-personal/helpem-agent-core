import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
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

    // Get credentials from environment
    const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!credentialsJson || !spreadsheetId) {
      console.error("Google Sheets credentials not configured");
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

    // Get user info from cookies/headers
    const userId = request.cookies.get("session_token")?.value?.slice(0, 10) || "demo_user";
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const sessionId = request.cookies.get("session_id")?.value || "unknown_session";

    // Prepare row data
    const timestamp = new Date().toISOString();
    const row = [
      timestamp,
      userId,
      "", // Email (not collected for privacy)
      category || "general",
      feedback,
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
