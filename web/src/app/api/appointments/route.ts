import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimiter";

// GET - Fetch user's appointments
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      console.log('📭 No auth - returning empty appointments');
      return NextResponse.json({ appointments: [] });
    }
    
    console.log(`🔍 Fetching appointments for user: ${user.userId}`);
    const result = await query(
      'SELECT * FROM appointments WHERE user_id = $1 ORDER BY datetime ASC',
      [user.userId]
    );
    
    console.log(`✅ Found ${result.rows.length} appointments for user`);
    return NextResponse.json({ appointments: result.rows });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

// POST - Create new appointment
export async function POST(req: Request) {
  try {
    // 🛡️ Rate limiting
    const clientIp = getClientIdentifier(req);
    const rateLimit = await checkRateLimit({
      identifier: `appointments:${clientIp}`,
      maxRequests: 50, // 50 appointment creations per hour
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
    
    const { title, datetime } = await req.json();
    
    // 🛡️ Input validation
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    
    if (title.length > 500) {
      return NextResponse.json({ error: "Title too long (max 500 characters)" }, { status: 400 });
    }
    
    if (!datetime || isNaN(Date.parse(datetime))) {
      return NextResponse.json({ error: "Valid datetime is required" }, { status: 400 });
    }
    
    // Sanitize title - remove HTML tags
    const sanitizedTitle = title.replace(/<[^>]*>/g, "").trim();
    
    console.log(`➕ Creating appointment for user: ${user.userId}`);
    const result = await query(
      'INSERT INTO appointments (user_id, title, datetime) VALUES ($1, $2, $3) RETURNING *',
      [user.userId, sanitizedTitle, datetime]
    );
    
    return NextResponse.json({ appointment: result.rows[0] });
  } catch (error) {
    console.error("❌ Error creating appointment:", error);
    
    // Don't expose internal error details to client
    if (error instanceof Error && error.message.includes("invalid input syntax")) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
