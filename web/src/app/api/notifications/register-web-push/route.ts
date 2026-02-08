import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * POST /api/notifications/register-web-push
 * Proxies to backend to register a Web Push subscription.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    // Get session token from cookie to forward to backend
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    const res = await fetch(`${BACKEND_URL}/notifications/register-web-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Web push registration proxy error:", error);
    return NextResponse.json(
      { error: "Failed to register web push" },
      { status: 500 }
    );
  }
}
