import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * POST /api/tribes/demo/seed
 * Auto-creates demo tribes for new users
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization") || "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const response = await fetch(`${BACKEND_URL}/tribes/demo/seed`, {
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
    console.error("Error seeding demo tribes:", error);
    return NextResponse.json(
      { error: "Failed to create demo tribes" },
      { status: 500 }
    );
  }
}
