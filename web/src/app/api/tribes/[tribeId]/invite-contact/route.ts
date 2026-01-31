import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// POST /api/tribes/[tribeId]/invite-contact - Invite by email/phone
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
    const res = await fetch(`${BACKEND_URL}/tribes/${tribeId}/invite-contact`, {
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
    console.error("Tribe invite contact proxy error:", error);
    return NextResponse.json({ error: "Failed to invite contact" }, { status: 500 });
  }
}
