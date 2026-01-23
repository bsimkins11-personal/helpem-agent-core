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
    const session = await verifySessionToken(req);
    if (!session.success) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const token = req.headers.get("authorization") || "";
    
    const response = await fetch(`${BACKEND_URL}/tribes/${tribeId}/inbox`, {
      method: "GET",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    
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
