import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/sessionAuth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * GET /api/tribes/[tribeId]/inbox
 * Proxy to backend GET /tribes/:tribeId/inbox
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { tribeId: string } }
) {
  try {
    const session = await verifySession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = req.headers.get("authorization") || "";
    const { tribeId } = params;
    
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
