import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET - Fetch user's todos
export async function GET(req: Request) {
  try {
    const result = await query(
      'SELECT * FROM todos ORDER BY created_at DESC'
    );
    
    return NextResponse.json({ todos: result.rows });
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
  }
}

// POST - Create new todo
export async function POST(req: Request) {
  try {
    const { title, priority, dueDate, reminderTime } = await req.json();
    
    const userId = '00000000-0000-0000-0000-000000000000';
    
    const result = await query(
      'INSERT INTO todos (user_id, title, priority, due_date, reminder_time) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, title, priority || 'medium', dueDate || null, reminderTime || null]
    );
    
    return NextResponse.json({ todo: result.rows[0] });
  } catch (error) {
    console.error("Error creating todo:", error);
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}
