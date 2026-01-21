import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/sessionAuth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * POST /api/tribes/[tribeId]/proposals/[proposalId]/not-now
 * Proxy to backend POST /tribes/:tribeId/proposals/:proposalId/not-now
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { tribeId: string; proposalId: string } }
) {
  try {
    const session = await verifySessionToken(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = req.headers.get("authorization") || "";
    const { tribeId, proposalId } = params;
    
    const response = await fetch(
      `${BACKEND_URL}/tribes/${tribeId}/proposals/${proposalId}/not-now`,
      {
        method: "POST",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating proposal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
