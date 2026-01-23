import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * POST /api/tribes/demo/cleanup
 * Remove all demo tribes for a user (when they create their first real tribe)
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization") || "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const response = await fetch(`${BACKEND_URL}/tribes/demo/cleanup/remove-all-demo`, {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error cleaning up demo tribes:", error);
    return NextResponse.json(
      { error: "Failed to clean up demo tribes" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tribes/demo/cleanup
 * Check demo tribes status
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization") || "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const response = await fetch(`${BACKEND_URL}/tribes/demo/cleanup/check`, {
      method: "GET",
      headers: {
        "Authorization": token,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error checking demo tribes:", error);
    return NextResponse.json(
      { error: "Failed to check demo tribes" },
      { status: 500 }
    );
  }
}
