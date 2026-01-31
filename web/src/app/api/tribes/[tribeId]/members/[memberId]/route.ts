import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tribeId: string; memberId: string }> }
) {
  try {
    const { tribeId, memberId } = await context.params;
    
    // Forward to backend
    const backendUrl = `${BACKEND_URL}/api/tribes/${tribeId}/members/${memberId}`;
    const authHeader = request.headers.get("authorization");
    
    const backendRes = await fetch(backendUrl, {
      method: "DELETE",
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    const data = await backendRes.json();

    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error("Error proxying DELETE /tribes/[tribeId]/members/[memberId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tribeId: string; memberId: string }> }
) {
  try {
    const { tribeId, memberId } = await context.params;
    const body = await request.json();
    
    // Forward to backend
    const backendUrl = `${BACKEND_URL}/api/tribes/${tribeId}/members/${memberId}`;
    const authHeader = request.headers.get("authorization");
    
    const backendRes = await fetch(backendUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();

    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error("Error proxying PATCH /tribes/[tribeId]/members/[memberId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
