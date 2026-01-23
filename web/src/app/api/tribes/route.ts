import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/sessionAuth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * GET /api/tribes
 * Proxy to backend GET /tribes
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const token = req.headers.get("authorization") || "";
    
    const response = await fetch(`${BACKEND_URL}/tribes`, {
      method: "GET",
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
    console.error("Error fetching tribes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tribes
 * Proxy to backend POST /tribes
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const token = req.headers.get("authorization") || "";
    const body = await req.json();
    
    const response = await fetch(`${BACKEND_URL}/tribes`, {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating tribe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
