import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimiter";

// GET - Fetch user's todos
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      console.log('📭 No auth - returning empty todos');
      return NextResponse.json({ todos: [] });
    }
    
    console.log(`🔍 Fetching todos for user: ${user.userId}`);
    const result = await query(
      'SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC',
      [user.userId]
    );
    
    console.log(`✅ Found ${result.rows.length} todos for user`);
    return NextResponse.json({ todos: result.rows });
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
  }
}

// POST - Create new todo
export async function POST(req: Request) {
  try {
    // 🛡️ Rate limiting
    const clientIp = getClientIdentifier(req);
    const rateLimit = await checkRateLimit({
      identifier: `todos:${clientIp}`,
      maxRequests: 50, // 50 todo creations per hour
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const user = await getAuthUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { title, priority, dueDate, reminderTime } = await req.json();
    
    // 🛡️ Input validation
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    
    if (title.length > 500) {
      return NextResponse.json({ error: "Title too long (max 500 characters)" }, { status: 400 });
    }
    
    const validPriorities = ["low", "medium", "high"];
    const sanitizedPriority = validPriorities.includes(priority) ? priority : "medium";
    
    // Sanitize title - remove HTML tags
    const sanitizedTitle = title.replace(/<[^>]*>/g, "").trim();
    
    // Validate date if provided
    if (dueDate && isNaN(Date.parse(dueDate))) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }
    
    console.log(`➕ Creating todo for user: ${user.userId}`);
    const result = await query(
      'INSERT INTO todos (user_id, title, priority, due_date, reminder_time) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user.userId, sanitizedTitle, sanitizedPriority, dueDate || null, reminderTime || null]
    );
    
    return NextResponse.json({ todo: result.rows[0] });
  } catch (error) {
    console.error("❌ Error creating todo:", error);
    
    // Don't expose internal error details to client
    if (error instanceof Error && error.message.includes("invalid input syntax")) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}

// PATCH - Update existing todo
export async function PATCH(req: Request) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id, title, priority, dueDate, reminderTime, completedAt } = await req.json();
    
    // Validation
    if (!id) {
      return NextResponse.json({ error: "Todo ID is required" }, { status: 400 });
    }
    
    if (title && typeof title !== "string") {
      return NextResponse.json({ error: "Title must be a string" }, { status: 400 });
    }
    
    if (title && title.length > 500) {
      return NextResponse.json({ error: "Title too long (max 500 characters)" }, { status: 400 });
    }
    
    if (priority && !["low", "medium", "high"].includes(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    
    if (dueDate && isNaN(Date.parse(dueDate))) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }
    
    if (reminderTime && isNaN(Date.parse(reminderTime))) {
      return NextResponse.json({ error: "Invalid reminder time" }, { status: 400 });
    }
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (title) {
      const sanitizedTitle = title.replace(/<[^>]*>/g, "").trim();
      updates.push(`title = $${paramIndex++}`);
      values.push(sanitizedTitle);
    }
    
    if (priority) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }
    
    if (dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(dueDate || null);
    }
    
    if (reminderTime !== undefined) {
      updates.push(`reminder_time = $${paramIndex++}`);
      values.push(reminderTime || null);
    }
    
    if (completedAt !== undefined) {
      updates.push(`completed_at = $${paramIndex++}`);
      values.push(completedAt || null);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    
    values.push(user.userId);
    values.push(id);
    
    console.log(`🔄 Updating todo ${id} for user: ${user.userId}`);
    const result = await query(
      `UPDATE todos SET ${updates.join(', ')} WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }
    
    console.log('✅ Todo updated successfully');
    return NextResponse.json({ todo: result.rows[0] });
  } catch (error) {
    console.error("❌ Error updating todo:", error);
    return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
  }
}

// DELETE - Delete todo
export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "Todo ID is required" }, { status: 400 });
    }
    
    console.log(`🗑️ Deleting todo ${id} for user: ${user.userId}`);
    const result = await query(
      'DELETE FROM todos WHERE user_id = $1 AND id = $2 RETURNING *',
      [user.userId, id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }
    
    console.log('✅ Todo deleted successfully');
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error("❌ Error deleting todo:", error);
    return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
  }
}
