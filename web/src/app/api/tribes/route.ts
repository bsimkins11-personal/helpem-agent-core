import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/sessionAuth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * GET /api/tribes
 * Proxy to backend GET /tribes
 */
export async function GET(req: NextRequest) {
  try {
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
    
    const response = await fetch(`${BACKEND_URL}/tribes`, {
      method: "GET",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
    });

    const raw = await response.text();
    const data = raw ? safeParseJson(raw) : {};
    
    if (!response.ok) {
      return NextResponse.json(buildUpstreamError(response.status, data, raw), {
        status: response.status,
      });
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

    const body = await req.json();
    
    const response = await fetch(`${BACKEND_URL}/tribes`, {
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
      return NextResponse.json(buildUpstreamError(response.status, data, raw), {
        status: response.status,
      });
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

function safeParseJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { error: raw || "Upstream error" };
  }
}

function buildUpstreamError(status: number, data: any, raw: string) {
  const payload: Record<string, any> =
    data && typeof data === "object" ? { ...data } : { error: raw || "Upstream error" };

  if (payload.upstreamStatus == null) {
    payload.upstreamStatus = status;
  }

  if (!payload.upstreamBody && raw && !raw.startsWith("{")) {
    payload.upstreamBody = raw.slice(0, 2000);
  }

  return payload;
}
