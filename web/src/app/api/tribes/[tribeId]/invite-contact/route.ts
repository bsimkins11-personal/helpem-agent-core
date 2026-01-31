import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tribeId: string }> }
) {
  try {
    const { tribeId } = await context.params;
    const body = await request.json();
    
    // Forward to backend
    const backendUrl = `${BACKEND_URL}/api/tribes/${tribeId}/invite-contact`;
    const authHeader = request.headers.get("authorization");
    
    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();

    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error("Error proxying POST /tribes/[tribeId]/invite-contact:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
