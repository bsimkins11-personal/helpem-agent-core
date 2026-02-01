import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const TEST_AUTH_SECRET = process.env.TEST_AUTH_SECRET || "helpem-qa-2026";

/**
 * POST /api/auth/test
 * Create a test user for QA purposes
 *
 * Body: { testUserId: "test_user_1", secret: "helpem-qa-2026" }
 * Returns: { session_token, user_id, is_new_user, trial_ends_at }
 */
export async function POST(req: Request) {
  try {
    const { testUserId, secret } = await req.json();

    // Verify QA secret
    if (secret !== TEST_AUTH_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    if (!testUserId || typeof testUserId !== "string") {
      return NextResponse.json({ error: "testUserId is required" }, { status: 400 });
    }

    // Sanitize test user ID
    const sanitizedId = testUserId.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
    const appleUserId = `test-${sanitizedId}`;

    // Check if user exists
    const existingUser = await query(
      "SELECT id, created_at FROM users WHERE apple_user_id = $1",
      [appleUserId]
    );

    let userId: string;
    let isNewUser = false;
    let createdAt: Date;

    if (existingUser.rows.length > 0) {
      // Existing test user
      userId = existingUser.rows[0].id;
      createdAt = existingUser.rows[0].created_at;

      // Update last active
      await query(
        "UPDATE users SET last_active_at = NOW() WHERE id = $1",
        [userId]
      );
    } else {
      // Create new test user
      const result = await query(
        "INSERT INTO users (apple_user_id) VALUES ($1) RETURNING id, created_at",
        [appleUserId]
      );
      userId = result.rows[0].id;
      createdAt = result.rows[0].created_at;
      isNewUser = true;
    }

    // Calculate trial end (30 days from creation)
    const trialEndsAt = new Date(createdAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    // Generate session token (30 day validity)
    const sessionToken = jwt.sign(
      { userId, appleUserId },
      JWT_SECRET,
      { expiresIn: "30d", algorithm: "HS256" }
    );

    console.log(`🧪 Test auth: ${isNewUser ? "Created" : "Retrieved"} user ${sanitizedId} (${userId})`);

    return NextResponse.json({
      session_token: sessionToken,
      user_id: userId,
      apple_user_id: appleUserId,
      is_new_user: isNewUser,
      created_at: createdAt.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      trial_days_remaining: Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
    });
  } catch (error) {
    console.error("Test auth error:", error);
    return NextResponse.json({ error: "Test auth failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/test
 * Delete a test user (for resetting QA state)
 *
 * Body: { testUserId: "test_user_1", secret: "helpem-qa-2026" }
 */
export async function DELETE(req: Request) {
  try {
    const { testUserId, secret } = await req.json();

    if (secret !== TEST_AUTH_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    if (!testUserId) {
      return NextResponse.json({ error: "testUserId is required" }, { status: 400 });
    }

    const sanitizedId = testUserId.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
    const appleUserId = `test-${sanitizedId}`;

    // Delete user and all related data (cascade)
    const result = await query(
      "DELETE FROM users WHERE apple_user_id = $1 RETURNING id",
      [appleUserId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Test user not found" }, { status: 404 });
    }

    console.log(`🧪 Test auth: Deleted user ${sanitizedId}`);

    return NextResponse.json({
      success: true,
      deleted_user_id: result.rows[0].id,
    });
  } catch (error) {
    console.error("Test auth delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
