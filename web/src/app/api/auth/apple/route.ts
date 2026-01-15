import { NextResponse } from "next/server";
import { verifyAppleIdentityToken } from "@/lib/appleAuth";
import { createSessionToken } from "@/lib/sessionAuth";
import { query } from "@/lib/db";

/**
 * POST /api/auth/apple
 * 
 * Authenticates a user via Sign in with Apple.
 * 
 * Request body:
 * {
 *   "apple_user_id": "000123.abc456...",   // userIdentifier from ASAuthorizationAppleIDCredential
 *   "identity_token": "eyJhbGciOi..."      // identityToken (JWT) from Apple
 * }
 * 
 * Response:
 * {
 *   "session_token": "app.jwt.token",
 *   "user_id": "uuid",
 *   "is_new_user": true/false
 * }
 * 
 * Errors:
 * - 400: Missing required fields
 * - 401: Invalid Apple identity token or user ID mismatch
 * - 500: Server error
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { apple_user_id, identity_token } = body;

    // Validate required fields
    if (!apple_user_id || typeof apple_user_id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid apple_user_id" },
        { status: 400 }
      );
    }

    if (!identity_token || typeof identity_token !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid identity_token" },
        { status: 400 }
      );
    }

    // Verify Apple identity token
    const appleAuth = await verifyAppleIdentityToken(identity_token);
    
    if (!appleAuth.success) {
      console.error("Apple auth failed:", appleAuth.error);
      return NextResponse.json(
        { error: appleAuth.error },
        { status: appleAuth.status }
      );
    }

    // Security check: Ensure the token's sub matches the provided apple_user_id
    if (appleAuth.user.id !== apple_user_id) {
      console.error(
        "Apple user ID mismatch:",
        `token.sub=${appleAuth.user.id}`,
        `provided=${apple_user_id}`
      );
      return NextResponse.json(
        { error: "Apple user ID mismatch" },
        { status: 401 }
      );
    }

    // Upsert user in database
    const upsertResult = await query(
      `INSERT INTO users (apple_user_id)
       VALUES ($1)
       ON CONFLICT (apple_user_id) DO UPDATE SET apple_user_id = EXCLUDED.apple_user_id
       RETURNING id, created_at`,
      [apple_user_id]
    );

    const user = upsertResult.rows[0];
    const userId = user.id;
    
    // Determine if this is a new user (created_at is very recent)
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const isNewUser = now.getTime() - createdAt.getTime() < 5000; // Created within last 5 seconds

    // Issue app-owned session token
    const sessionToken = createSessionToken(userId, apple_user_id);

    console.log(
      `✅ Auth success: user=${userId}, apple_user=${apple_user_id.substring(0, 10)}..., new=${isNewUser}`
    );

    return NextResponse.json({
      session_token: sessionToken,
      user_id: userId,
      is_new_user: isNewUser,
    });

  } catch (error) {
    console.error("Auth error:", error);
    
    // Check if it's a database error
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

/**
 * GET /api/auth/apple
 * 
 * Health check endpoint for the auth service.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "auth/apple",
    version: "1.0.0",
  });
}
