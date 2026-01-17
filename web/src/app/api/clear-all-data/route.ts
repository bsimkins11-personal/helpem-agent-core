import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// DELETE - Clear all data for authenticated user
export async function DELETE(req: Request) {
  try {
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
    
    const deletedChatMessages = await query(
      'DELETE FROM chat_messages WHERE user_id = $1',
      [user.userId]
    );
    
    console.log(`✅ Cleared data for user ${user.userId}:`);
    console.log(`   - ${deletedTodos.rowCount} todos`);
    console.log(`   - ${deletedAppointments.rowCount} appointments`);
    console.log(`   - ${deletedHabits.rowCount} habits`);
    console.log(`   - ${deletedInputs.rowCount} user inputs`);
    console.log(`   - ${deletedInstructions.rowCount} user instructions`);
    console.log(`   - ${deletedChatMessages.rowCount} chat messages`);
    
    return NextResponse.json({ 
      success: true,
      deleted: {
        todos: deletedTodos.rowCount,
        appointments: deletedAppointments.rowCount,
        habits: deletedHabits.rowCount,
        userInputs: deletedInputs.rowCount,
        userInstructions: deletedInstructions.rowCount,
        chatMessages: deletedChatMessages.rowCount,
      }
    });
    
  } catch (error) {
    console.error("❌ Error clearing user data:", error);
    return NextResponse.json({ error: "Failed to clear data" }, { status: 500 });
  }
}
