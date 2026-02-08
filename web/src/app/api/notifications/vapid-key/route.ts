import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * GET /api/notifications/vapid-key
 * Proxies to backend to get the VAPID public key.
 */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/notifications/vapid-public-key`);
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("VAPID key proxy error:", error);
    return NextResponse.json(
      { error: "Failed to get VAPID key" },
      { status: 500 }
    );
  }
}
