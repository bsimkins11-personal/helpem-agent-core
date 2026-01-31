import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// POST /api/tribes/[tribeId]/items - Create tribe item (creates proposals)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tribeId: string }> }
) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tribeId } = await params;

  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/tribes/${tribeId}/items`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Tribe create item proxy error:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
