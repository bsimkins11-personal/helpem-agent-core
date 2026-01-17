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
