import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/sessionAuth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * GET /api/tribes/[tribeId]/inbox
 * Proxy to backend GET /tribes/:tribeId/inbox
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

    const session = await verifySessionToken(req);
    if (!session.success) {
      if (session.status !== 500) {
        return NextResponse.json({ error: session.error }, { status: session.status });
      }
      console.warn("JWT secrets missing in web env; proxying anyway");
    }

    const response = await fetch(`${BACKEND_URL}/tribes/${tribeId}/inbox`, {
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
  } catch (error) {
    console.error("Error fetching tribe inbox:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function safeParseJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { error: raw || "Upstream error" };
  }
}
