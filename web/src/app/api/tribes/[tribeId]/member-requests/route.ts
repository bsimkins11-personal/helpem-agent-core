import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(
  request: NextRequest,
  { params }: { params: { tribeId: string } }
) {
  try {
    const { tribeId } = params;
    
    // Forward to backend
    const backendUrl = `${BACKEND_URL}/api/tribes/${tribeId}/member-requests`;
    const authHeader = request.headers.get("authorization");
    
    const backendRes = await fetch(backendUrl, {
      method: "GET",
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    const data = await backendRes.json();

    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error("Error proxying GET /tribes/[tribeId]/member-requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
