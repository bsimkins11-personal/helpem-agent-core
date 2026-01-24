import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "https://api-production-2989.up.railway.app";

/**
 * GET /api/tribes/[tribeId]/messages
 * Proxy to backend GET /tribes/:tribeId/messages
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tribeId: string }> }
) {
  try {
    const { tribeId } = await params;
    const token = req.headers.get("authorization") || "";
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const response = await fetch(`${BACKEND_URL}/tribes/${tribeId}/messages`, {
      method: "GET",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
    });

    const raw = await response.text();
    const data = raw ? safeParseJson(raw) : {};
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[messages GET] Error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tribes/[tribeId]/messages
 * Proxy to backend POST /tribes/:tribeId/messages
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tribeId: string }> }
) {
  try {
    const { tribeId } = await params;
    const token = req.headers.get("authorization") || "";
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    const response = await fetch(`${BACKEND_URL}/tribes/${tribeId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await response.text();
    const data = raw ? safeParseJson(raw) : {};
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[messages POST] Error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

function safeParseJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return { error: raw || "Upstream error" };
  }
}
