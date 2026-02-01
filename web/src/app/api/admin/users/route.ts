import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const ADMIN_SECRET = process.env.TEST_AUTH_SECRET || "helpem-qa-2026";

/**
 * GET /api/admin/users?secret=...
 * List all users for QA/admin purposes
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await query(
    `SELECT id, apple_user_id, created_at, last_active_at
     FROM users
     ORDER BY created_at DESC
     LIMIT 50`
  );

  return NextResponse.json({ users: result.rows });
}
