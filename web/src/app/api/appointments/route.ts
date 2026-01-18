import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimiter";

type PgError = {
  code?: string;
  message?: string;
};

async function ensureAppointmentsTable() {
  await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await query(
    `CREATE TABLE IF NOT EXISTS appointments (
      id UUID NOT NULL DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      title TEXT NOT NULL,
      datetime TIMESTAMP(3) NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT appointments_pkey PRIMARY KEY (id)
    )`
  );
  await query('CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON appointments(user_id)');
}

function isMissingTableError(error: PgError) {
  return error?.code === "42P01";
}

function isMissingUuidFunction(error: PgError) {
  return error?.code === "42883";
}

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
    const pgError = error as PgError;
    if (isMissingTableError(pgError) || isMissingUuidFunction(pgError)) {
      try {
        await ensureAppointmentsTable();
        return NextResponse.json({ appointments: [] });
      } catch (setupError) {
        console.error("Error ensuring appointments table:", setupError);
      }
    }
    console.error("Error fetching appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

// POST - Create new appointment
export async function POST(req: Request) {
  console.log('🔵 ========================================');
  console.log('🔵 POST /api/appointments - Request Received');
  console.log('🔵 ========================================');
  
  try {
    // 🛡️ Rate limiting
    const clientIp = getClientIdentifier(req);
    console.log('🔍 Client IP:', clientIp);
    
    const rateLimit = await checkRateLimit({
      identifier: `appointments:${clientIp}`,
      maxRequests: 50, // 50 appointment creations per hour
      windowMs: 60 * 60 * 1000,
    });
    console.log('🔍 Rate limit check:', rateLimit);

    if (!rateLimit.allowed) {
      console.log('❌ Rate limit exceeded');
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    console.log('🔍 Checking authentication...');
    const user = await getAuthUser(req);
    
    if (!user) {
      console.error('❌ UNAUTHORIZED - No valid user session');
      console.error('❌ getAuthUser returned null');
      const authHeader = req.headers.get('Authorization');
      console.error('❌ Authorization header:', authHeader ? 'Present' : 'MISSING');
      
      // Return detailed error for debugging
      return NextResponse.json({ 
        error: "Unauthorized",
        debug: {
          reason: "getAuthUser returned null - JWT verification failed",
          hasAuthHeader: !!authHeader,
          suggestion: "Check Vercel logs or JWT_SECRET environment variable"
        }
      }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.userId);
    
    const body = await req.json();
    console.log('📦 Request body:', body);
    
    const { title, datetime } = body;
    
    // 🛡️ Input validation
    if (!title || typeof title !== "string") {
      console.error('❌ Validation failed: Title missing or invalid');
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    
    if (title.length > 500) {
      console.error('❌ Validation failed: Title too long');
      return NextResponse.json({ error: "Title too long (max 500 characters)" }, { status: 400 });
    }
    
    if (!datetime || isNaN(Date.parse(datetime))) {
      console.error('❌ Validation failed: Invalid datetime:', datetime);
      return NextResponse.json({ error: "Valid datetime is required" }, { status: 400 });
    }
    
    // Sanitize title - remove HTML tags
    const sanitizedTitle = title.replace(/<[^>]*>/g, "").trim();
    console.log('🧹 Sanitized title:', sanitizedTitle);
    
    console.log(`➕ Inserting appointment into database...`);
    console.log(`   User ID: ${user.userId}`);
    console.log(`   Title: ${sanitizedTitle}`);
    console.log(`   Datetime: ${datetime}`);
    
    let result;
    try {
      result = await query(
        'INSERT INTO appointments (user_id, title, datetime) VALUES ($1, $2, $3) RETURNING *',
        [user.userId, sanitizedTitle, datetime]
      );
    } catch (error) {
      const pgError = error as PgError;
      if (isMissingTableError(pgError) || isMissingUuidFunction(pgError)) {
        console.warn("⚠️ Appointments table missing. Creating it now.");
        await ensureAppointmentsTable();
        result = await query(
          'INSERT INTO appointments (user_id, title, datetime) VALUES ($1, $2, $3) RETURNING *',
          [user.userId, sanitizedTitle, datetime]
        );
      } else {
        throw error;
      }
    }
    
    console.log('✅ Database INSERT successful!');
    console.log('✅ Returned appointment:', result.rows[0]);
    console.log('🔵 ========================================');
    
    return NextResponse.json({ appointment: result.rows[0] });
  } catch (error) {
    console.error('🔴 ========================================');
    console.error("❌ CRITICAL ERROR in POST /api/appointments");
    console.error("❌ Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("❌ Error message:", error instanceof Error ? error.message : String(error));
    console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error('🔴 ========================================');
    
    // Don't expose internal error details to client
    if (error instanceof Error && error.message.includes("invalid input syntax")) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}

// PATCH - Update existing appointment
export async function PATCH(req: Request) {
  console.log('🔵 ========================================');
  console.log('🔵 PATCH /api/appointments - Request Received');
  console.log('🔵 ========================================');
  
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      console.error('❌ UNAUTHORIZED');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    console.log('📦 Request body:', body);
    
    const { id, title, datetime } = body;
    
    // Validation
    if (!id) {
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
    }
    
    if (title && typeof title !== "string") {
      return NextResponse.json({ error: "Title must be a string" }, { status: 400 });
    }
    
    if (title && title.length > 500) {
      return NextResponse.json({ error: "Title too long (max 500 characters)" }, { status: 400 });
    }
    
    if (datetime && isNaN(Date.parse(datetime))) {
      return NextResponse.json({ error: "Invalid datetime" }, { status: 400 });
    }
    
    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (title) {
      const sanitizedTitle = title.replace(/<[^>]*>/g, "").trim();
      updates.push(`title = $${paramIndex++}`);
      values.push(sanitizedTitle);
    }
    
    if (datetime) {
      updates.push(`datetime = $${paramIndex++}`);
      values.push(datetime);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    
    // Add user_id and id to parameters
    values.push(user.userId);
    values.push(id);
    
    console.log(`🔄 Updating appointment ${id} for user: ${user.userId}`);
    const result = await query(
      `UPDATE appointments SET ${updates.join(', ')} WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      console.error('❌ Appointment not found or unauthorized');
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    
    console.log('✅ Appointment updated successfully');
    console.log('🔵 ========================================');
    return NextResponse.json({ appointment: result.rows[0] });
  } catch (error) {
    console.error('🔴 ========================================');
    console.error("❌ Error updating appointment:", error);
    console.error('🔴 ========================================');
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}

// DELETE - Delete appointment
export async function DELETE(req: Request) {
  console.log('🔵 ========================================');
  console.log('🔵 DELETE /api/appointments - Request Received');
  console.log('🔵 ========================================');
  
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      console.error('❌ UNAUTHORIZED');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    console.log('🔍 Deleting appointment ID:', id);
    
    if (!id) {
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
    }
    
    console.log(`🗑️ Deleting appointment ${id} for user: ${user.userId}`);
    const result = await query(
      'DELETE FROM appointments WHERE user_id = $1 AND id = $2 RETURNING *',
      [user.userId, id]
    );
    
    if (result.rows.length === 0) {
      console.error('❌ Appointment not found or unauthorized');
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    
    console.log('✅ Appointment deleted successfully');
    console.log('🔵 ========================================');
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('🔴 ========================================');
    console.error("❌ Error deleting appointment:", error);
    console.error('🔴 ========================================');
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
  }
}
