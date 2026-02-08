import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "https://api-production-2989.up.railway.app";

// PATCH /api/apple/calendar/events/[eventUrl] - Update event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventUrl: string }> }
) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventUrl } = await params;

  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/apple/calendar/events/${eventUrl}`, {
      method: "PATCH",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Apple Calendar update event proxy error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

// DELETE /api/apple/calendar/events/[eventUrl] - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventUrl: string }> }
) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventUrl } = await params;

  try {
    const res = await fetch(`${BACKEND_URL}/apple/calendar/events/${eventUrl}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Apple Calendar delete event proxy error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
