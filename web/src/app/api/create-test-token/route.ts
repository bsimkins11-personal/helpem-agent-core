import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/sessionAuth";

export async function GET() {
  try {
    const userId = "ff5cfcbc-9afc-4634-9d0d-1258ed4fd018";
    const appleUserId = "001907.009a25f5e3b448aaa6a05740a97379d8.0017";
    
    const token = createSessionToken(userId, { appleUserId });
    
    return NextResponse.json({
      success: true,
      token,
      userId,
      appleUserId
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
