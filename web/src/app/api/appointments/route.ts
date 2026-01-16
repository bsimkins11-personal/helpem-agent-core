import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET - Fetch user's appointments
export async function GET(req: Request) {
  try {
    // For now, return all appointments (add auth later)
    const result = await query(
      'SELECT * FROM appointments ORDER BY datetime ASC'
    );
    
    return NextResponse.json({ appointments: result.rows });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

// POST - Create new appointment
export async function POST(req: Request) {
  try {
    const { title, datetime } = await req.json();
    
    // For now, use a placeholder user_id (add real auth later)
    const userId = '00000000-0000-0000-0000-000000000000';
    
    const result = await query(
      'INSERT INTO appointments (user_id, title, datetime) VALUES ($1, $2, $3) RETURNING *',
      [userId, title, datetime]
    );
    
    return NextResponse.json({ appointment: result.rows[0] });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
