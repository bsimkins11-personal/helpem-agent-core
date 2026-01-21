import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/sessionAuth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * DELETE /api/tribes/[tribeId]/proposals/[proposalId]
 * Proxy to backend DELETE /tribes/:tribeId/proposals/:proposalId
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { tribeId: string; proposalId: string } }
) {
  try {
    const session = await verifySession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = req.headers.get("authorization") || "";
    const { tribeId, proposalId } = params;
    
    const response = await fetch(
      `${BACKEND_URL}/tribes/${tribeId}/proposals/${proposalId}`,
      {
        method: "DELETE",
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
    console.error("Error dismissing proposal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
