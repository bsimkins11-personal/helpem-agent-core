import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// GET /api/tribes/[tribeId]/shared - Get accepted/shared items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tribeId: string }> }
) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tribeId } = await params;

  try {
    const res = await fetch(`${BACKEND_URL}/tribes/${tribeId}/shared`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Tribe shared items proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch shared items" }, { status: 500 });
  }
}
