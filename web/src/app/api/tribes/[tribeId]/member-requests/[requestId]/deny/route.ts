import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tribeId: string; requestId: string }> }
) {
  try {
    const { tribeId, requestId } = await context.params;
    
    // Forward to backend
    const backendUrl = `${BACKEND_URL}/api/tribes/${tribeId}/member-requests/${requestId}/deny`;
    const authHeader = request.headers.get("authorization");
    
    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    const data = await backendRes.json();

    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error("Error proxying POST /tribes/[tribeId]/member-requests/[requestId]/deny:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
