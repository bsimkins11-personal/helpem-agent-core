import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

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
    const user = await getAuthUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { title, datetime } = await req.json();
    
    console.log(`➕ Creating appointment for user: ${user.userId}`);
    const result = await query(
      'INSERT INTO appointments (user_id, title, datetime) VALUES ($1, $2, $3) RETURNING *',
      [user.userId, title, datetime]
    );
    
    return NextResponse.json({ appointment: result.rows[0] });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
