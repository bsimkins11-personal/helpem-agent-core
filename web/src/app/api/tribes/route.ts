import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "https://api-production-2989.up.railway.app";

/**
 * GET /api/tribes
 * Proxy to backend GET /tribes
 * Note: Backend handles auth verification, we just proxy the request
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization") || "";
    
    // Log for debugging (will show in Vercel function logs)
    console.log("[tribes] GET request, token present:", !!token);
    console.log("[tribes] BACKEND_URL:", BACKEND_URL);
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized - no token" }, { status: 401 });
    }
    
    // Directly proxy to backend - let backend handle auth
    const backendUrl = `${BACKEND_URL}/tribes`;
    console.log("[tribes] Fetching from:", backendUrl);
    
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
    });

    console.log("[tribes] Backend response status:", response.status);
    
    const raw = await response.text();
    const data = raw ? safeParseJson(raw) : {};
    
    if (!response.ok) {
      console.log("[tribes] Backend error:", response.status, raw.substring(0, 200));
      return NextResponse.json(buildUpstreamError(response.status, data, raw), {
        status: response.status,
      });
    }

    console.log("[tribes] Success, tribes count:", data.tribes?.length || 0);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[tribes] Error:", error?.message);
    console.error("[tribes] Error stack:", error?.stack);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error?.message,
        backendUrl: BACKEND_URL
      },
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
      return NextResponse.json({ error: "Unauthorized - no token" }, { status: 401 });
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
  } catch (error: any) {
    console.error("[tribes POST] Error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
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
