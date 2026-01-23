import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/sessionAuth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * POST /api/tribes/[tribeId]/proposals/[proposalId]/accept
 * Proxy to backend POST /tribes/:tribeId/proposals/:proposalId/accept
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tribeId: string; proposalId: string }> }
) {
  try {
    const { tribeId, proposalId } = await params;
    const session = await verifySessionToken(req);
    if (!session.success) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const token = req.headers.get("authorization") || "";
    
    const response = await fetch(
      `${BACKEND_URL}/tribes/${tribeId}/proposals/${proposalId}/accept`,
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
    console.error("Error accepting proposal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
