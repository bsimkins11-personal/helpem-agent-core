import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimiter";
import { auditLog } from "@/lib/auditLog";

// POST - Clear specific data types for authenticated user
export async function POST(req: Request) {
  try {
    // 🛡️ Strict rate limiting - This is a destructive operation
    const clientIp = getClientIdentifier(req);
    const rateLimit = await checkRateLimit({
      identifier: `clear-data:${clientIp}`,
      maxRequests: 5, // Only 5 selective clears per hour
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many data clear requests. Please try again later." },
        { status: 429 }
      );
    }

    const user = await getAuthUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    const { dataTypes } = body;
    
    if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
      return NextResponse.json({ error: "No data types specified" }, { status: 400 });
    }
    
    console.log(`🗑️ Clearing selected data types for user: ${user.userId}`, dataTypes);
    
    const deletedCounts: Record<string, number> = {};
    
    // Delete requested data types
    if (dataTypes.includes('todos')) {
      const result = await query(
        'DELETE FROM todos WHERE user_id = $1',
        [user.userId]
      );
      deletedCounts.todos = result.rowCount || 0;
    }
    
    if (dataTypes.includes('groceries')) {
      try {
        const result = await query(
          'DELETE FROM groceries WHERE user_id = $1',
          [user.userId]
        );
        deletedCounts.groceries = result.rowCount || 0;
      } catch (error) {
        console.error('❌ Failed to clear groceries:', error);
        deletedCounts.groceries = 0;
      }
    }
    
    if (dataTypes.includes('appointments')) {
      const result = await query(
        'DELETE FROM appointments WHERE user_id = $1',
        [user.userId]
      );
      deletedCounts.appointments = result.rowCount || 0;
    }
    
    if (dataTypes.includes('habits')) {
      const result = await query(
        'DELETE FROM habits WHERE user_id = $1',
        [user.userId]
      );
      deletedCounts.habits = result.rowCount || 0;
    }
    
    if (dataTypes.includes('routines')) {
      // Routines are client-only; no server table exists.
      deletedCounts.routines = 0;
    }
    
    if (dataTypes.includes('chat')) {
      const inputsResult = await query(
        'DELETE FROM user_inputs WHERE user_id = $1',
        [user.userId]
      );
      const instructionsResult = await query(
        'DELETE FROM user_instructions WHERE user_id = $1',
        [user.userId]
      );
      deletedCounts.chatMessages = inputsResult.rowCount || 0;
      deletedCounts.userInstructions = instructionsResult.rowCount || 0;
    }
    
    console.log(`✅ Cleared selected data for user ${user.userId}:`, deletedCounts);
    
    // 🔒 Audit log - Critical data deletion
    auditLog("DATA_DELETE_SELECTIVE", {
      userId: user.userId,
      dataTypes,
      deletedCounts,
    }, req);
    
    return NextResponse.json({ 
      success: true,
      deleted: deletedCounts,
    });
    
  } catch (error) {
    console.error("❌ Error clearing user data:", error);
    return NextResponse.json({ error: "Failed to clear data" }, { status: 500 });
  }
}
