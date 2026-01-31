import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// PATCH /api/google/calendar/events/[eventId] - Update event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;

  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/google/calendar/events/${eventId}`, {
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
    console.error("Google Calendar update event proxy error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

// DELETE /api/google/calendar/events/[eventId] - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;

  try {
    const res = await fetch(`${BACKEND_URL}/google/calendar/events/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });
    
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Google Calendar delete event proxy error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
