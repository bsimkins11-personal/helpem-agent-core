import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimiter";
import { auditLog } from "@/lib/auditLog";

// DELETE - Clear all data for authenticated user
export async function DELETE(req: Request) {
  try {
    // 🛡️ Strict rate limiting - This is a destructive operation
    const clientIp = getClientIdentifier(req);
    const rateLimit = await checkRateLimit({
      identifier: `clear-data:${clientIp}`,
      maxRequests: 3, // Only 3 data clears per hour
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
    
    console.log(`🗑️ Clearing all data for user: ${user.userId}`);
    
    // Delete all user data from database
    const deletedTodos = await query(
      'DELETE FROM todos WHERE user_id = $1',
      [user.userId]
    );
    
    const deletedAppointments = await query(
      'DELETE FROM appointments WHERE user_id = $1',
      [user.userId]
    );

    let deletedGroceriesCount = 0;
    try {
      const deletedGroceries = await query(
        'DELETE FROM groceries WHERE user_id = $1',
        [user.userId]
      );
      deletedGroceriesCount = deletedGroceries.rowCount || 0;
    } catch (error) {
      console.error('❌ Failed to clear groceries:', error);
    }
    
    const deletedHabits = await query(
      'DELETE FROM habits WHERE user_id = $1',
      [user.userId]
    );
    
    const deletedInputs = await query(
      'DELETE FROM user_inputs WHERE user_id = $1',
      [user.userId]
    );
    
    const deletedInstructions = await query(
      'DELETE FROM user_instructions WHERE user_id = $1',
      [user.userId]
    );
    
    
    const deletedCounts = {
      todos: deletedTodos.rowCount,
      appointments: deletedAppointments.rowCount,
      habits: deletedHabits.rowCount,
      userInputs: deletedInputs.rowCount,
      userInstructions: deletedInstructions.rowCount,
      chatMessages: 0,
      groceries: deletedGroceriesCount,
    };
    
    console.log(`✅ Cleared data for user ${user.userId}:`);
    console.log(`   - ${deletedCounts.todos} todos`);
    console.log(`   - ${deletedCounts.appointments} appointments`);
    console.log(`   - ${deletedCounts.habits} habits`);
    console.log(`   - ${deletedCounts.userInputs} user inputs`);
    console.log(`   - ${deletedCounts.userInstructions} user instructions`);
    console.log(`   - ${deletedCounts.chatMessages} chat messages`);
    
    // 🔒 Audit log - Critical data deletion
    auditLog("DATA_DELETE", {
      userId: user.userId,
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
