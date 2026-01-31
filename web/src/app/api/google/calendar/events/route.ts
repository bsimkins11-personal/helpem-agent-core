import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// GET /api/google/calendar/events - List events
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");
  const maxResults = searchParams.get("maxResults");

  const params = new URLSearchParams();
  if (timeMin) params.append("timeMin", timeMin);
  if (timeMax) params.append("timeMax", timeMax);
  if (maxResults) params.append("maxResults", maxResults);

  const queryString = params.toString() ? `?${params.toString()}` : "";

  try {
    const res = await fetch(`${BACKEND_URL}/google/calendar/events${queryString}`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Google Calendar events proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

// POST /api/google/calendar/events - Create event
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/google/calendar/events`, {
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
    console.error("Google Calendar create event proxy error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
