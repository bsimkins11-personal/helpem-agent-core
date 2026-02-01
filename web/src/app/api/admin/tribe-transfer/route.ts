import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const ADMIN_SECRET = process.env.TEST_AUTH_SECRET || "helpem-qa-2026";

/**
 * POST /api/admin/tribe-transfer
 * Transfer tribe ownership (QA/admin only)
 *
 * Body: { tribeId, newOwnerId, secret }
 */
export async function POST(req: Request) {
  try {
    const { tribeId, newOwnerId, secret } = await req.json();

    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!tribeId || !newOwnerId) {
      return NextResponse.json({ error: "tribeId and newOwnerId required" }, { status: 400 });
    }

    // Verify new owner exists
    const userCheck = await query("SELECT id FROM users WHERE id = $1", [newOwnerId]);
    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: "New owner not found" }, { status: 404 });
    }

    // Ensure new owner is a member of the tribe (or add them)
    const memberCheck = await query(
      "SELECT id FROM tribe_members WHERE tribe_id = $1 AND user_id = $2",
      [tribeId, newOwnerId]
    );

    if (memberCheck.rows.length === 0) {
      // Add as member first
      await query(
        `INSERT INTO tribe_members (tribe_id, user_id, invited_by, accepted_at, management_scope)
         VALUES ($1, $2, $2, NOW(), 'only_shared')`,
        [tribeId, newOwnerId]
      );
    } else {
      // Ensure they're accepted
      await query(
        "UPDATE tribe_members SET accepted_at = COALESCE(accepted_at, NOW()), left_at = NULL WHERE tribe_id = $1 AND user_id = $2",
        [tribeId, newOwnerId]
      );
    }

    // Transfer ownership
    const result = await query(
      "UPDATE tribes SET owner_id = $1 WHERE id = $2 RETURNING id, name, owner_id",
      [newOwnerId, tribeId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Tribe not found" }, { status: 404 });
    }

    console.log(`🔄 Transferred tribe ${tribeId} to user ${newOwnerId}`);

    return NextResponse.json({
      success: true,
      tribe: result.rows[0],
    });
  } catch (error) {
    console.error("Tribe transfer error:", error);
    return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
  }
}
