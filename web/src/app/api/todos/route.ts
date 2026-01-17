import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

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
    const user = await getAuthUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { title, priority, dueDate, reminderTime } = await req.json();
    
    console.log(`➕ Creating todo for user: ${user.userId}`);
    const result = await query(
      'INSERT INTO todos (user_id, title, priority, due_date, reminder_time) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user.userId, title, priority || 'medium', dueDate || null, reminderTime || null]
    );
    
    return NextResponse.json({ todo: result.rows[0] });
  } catch (error) {
    console.error("Error creating todo:", error);
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}
