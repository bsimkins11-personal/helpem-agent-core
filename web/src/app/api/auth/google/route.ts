import { NextResponse } from "next/server";
import { verifyGoogleIdToken } from "@/lib/googleAuth";
import { createSessionToken } from "@/lib/sessionAuth";
import { query } from "@/lib/db";

/**
 * POST /api/auth/google
 *
 * Authenticates a user via Google Sign In.
 *
 * Request body:
 * {
 *   "credential": "eyJhbGciOi..."  // Google ID token JWT
 * }
 *
 * Response:
 * {
 *   "session_token": "app.jwt.token",
 *   "user_id": "uuid",
 *   "is_new_user": true/false
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credential } = body;

    if (!credential || typeof credential !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid credential" },
        { status: 400 }
      );
    }

    // Verify Google ID token
    const googleAuth = await verifyGoogleIdToken(credential);

    if (!googleAuth.success) {
      console.error("Google auth failed:", googleAuth.error);
      return NextResponse.json(
        { error: googleAuth.error },
        { status: googleAuth.status }
      );
    }

    const { id: googleUserId, email, name } = googleAuth.user;

    // Upsert user by google_user_id
    const upsertResult = await query(
      `INSERT INTO users (google_user_id, email, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (google_user_id) DO UPDATE SET
         email = COALESCE(EXCLUDED.email, users.email),
         display_name = COALESCE(users.display_name, EXCLUDED.display_name)
       RETURNING id, created_at`,
      [googleUserId, email, name]
    );

    const user = upsertResult.rows[0];
    const userId = user.id;

    // Determine if new user
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const isNewUser = now.getTime() - createdAt.getTime() < 5000;

    // Issue session token
    const sessionToken = createSessionToken(userId, { googleUserId });

    console.log(
      `✅ Google auth success: user=${userId}, google_user=${googleUserId.substring(0, 10)}..., new=${isNewUser}`
    );

    const response = NextResponse.json({
      session_token: sessionToken,
      user_id: userId,
      is_new_user: isNewUser,
    });

    // Set HttpOnly cookie for web sessions
    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Google auth error:", error);

    const err = error as Error & { code?: string };
    if (err.code) {
      console.error("Database error code:", err.code);
    }

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
