import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/sessionAuth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * DELETE /api/tribes/[tribeId]/proposals/[proposalId]
 * Proxy to backend DELETE /tribes/:tribeId/proposals/:proposalId
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tribeId: string; proposalId: string }> }
) {
  try {
    const { tribeId, proposalId } = await params;
    const token = req.headers.get("authorization") || "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySessionToken(req);
    if (!session.success) {
      if (session.status !== 500) {
        return NextResponse.json({ error: session.error }, { status: session.status });
      }
      console.warn("JWT secrets missing in web env; proxying anyway");
    }

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

    const raw = await response.text();
    const data = raw ? safeParseJson(raw) : {};
    
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

function safeParseJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { error: raw || "Upstream error" };
  }
}
