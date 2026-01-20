import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimiter";

type PgError = {
  code?: string;
  message?: string;
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return uuidRegex.test(value);
}

async function ensureAppointmentsTable() {
  await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await query(
    `CREATE TABLE IF NOT EXISTS appointments (
      id UUID NOT NULL DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      title TEXT NOT NULL,
      with_whom TEXT,
      topic TEXT,
      location TEXT,
      datetime TIMESTAMP(3) NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT appointments_pkey PRIMARY KEY (id)
    )`
  );
  await query(
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30'
  );
  await query(
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS with_whom TEXT'
  );
  await query(
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS topic TEXT'
  );
  await query(
    'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location TEXT'
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
    
    const { title, datetime, durationMinutes, withWhom, topic, location } = body;
    
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

    const parsedDuration = Number.isFinite(durationMinutes) ? Number(durationMinutes) : 30;
    if (!Number.isInteger(parsedDuration) || parsedDuration <= 0 || parsedDuration > 12 * 60) {
      console.error('❌ Validation failed: Invalid durationMinutes:', durationMinutes);
      return NextResponse.json({ error: "Valid durationMinutes is required" }, { status: 400 });
    }

    // withWhom is MANDATORY
    if (!withWhom || typeof withWhom !== "string") {
      console.error('❌ Validation failed: withWhom is required (mandatory field)');
      return NextResponse.json({ error: "withWhom is required - who is the meeting with?" }, { status: 400 });
    }

    if (topic !== undefined && topic !== null && typeof topic !== "string") {
      return NextResponse.json({ error: "topic must be a string" }, { status: 400 });
    }

    if (location !== undefined && location !== null && typeof location !== "string") {
      return NextResponse.json({ error: "location must be a string" }, { status: 400 });
    }
    
    // Sanitize title - remove HTML tags
    const sanitizedTitle = title.replace(/<[^>]*>/g, "").trim();
    console.log('🧹 Sanitized title:', sanitizedTitle);
    
    console.log(`➕ Inserting appointment into database...`);
    console.log(`   User ID: ${user.userId}`);
    console.log(`   Title: ${sanitizedTitle}`);
    console.log(`   Datetime: ${datetime}`);
    console.log(`   Duration: ${parsedDuration} minutes`);
    console.log(`   With: ${withWhom ?? "N/A"}`);
    console.log(`   Topic: ${topic ?? "N/A"}`);
    console.log(`   Location: ${location ?? "N/A"}`);

    const startTime = new Date(datetime);
    const endTime = new Date(startTime.getTime() + parsedDuration * 60 * 1000);

    let conflicts;
    try {
      conflicts = await query(
        `SELECT id, title, datetime, duration_minutes
         FROM appointments
         WHERE user_id = $1
           AND datetime < $2
           AND (datetime + (COALESCE(duration_minutes, 30) || ' minutes')::interval) > $3
         ORDER BY datetime ASC
         LIMIT 1`,
        [user.userId, endTime.toISOString(), startTime.toISOString()]
      );
    } catch (error) {
      const pgError = error as PgError;
      if (isMissingTableError(pgError) || isMissingUuidFunction(pgError)) {
        console.warn("⚠️ Appointments table missing. Creating it now.");
        await ensureAppointmentsTable();
        conflicts = await query(
          `SELECT id, title, datetime, duration_minutes
           FROM appointments
           WHERE user_id = $1
             AND datetime < $2
             AND (datetime + (COALESCE(duration_minutes, 30) || ' minutes')::interval) > $3
           ORDER BY datetime ASC
           LIMIT 1`,
          [user.userId, endTime.toISOString(), startTime.toISOString()]
        );
      } else {
        throw error;
      }
    }

    if (conflicts.rows.length > 0) {
      const conflict = conflicts.rows[0];
      console.warn('⚠️ Conflict detected with appointment:', conflict);
      return NextResponse.json(
        { error: "Conflicting appointment", conflict },
        { status: 409 }
      );
    }
    
    let result;
    try {
      result = await query(
        'INSERT INTO appointments (user_id, title, with_whom, topic, location, datetime, duration_minutes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [user.userId, sanitizedTitle, withWhom ?? null, topic ?? null, location ?? null, datetime, parsedDuration]
      );
    } catch (error) {
      const pgError = error as PgError;
      if (isMissingTableError(pgError) || isMissingUuidFunction(pgError)) {
        console.warn("⚠️ Appointments table missing. Creating it now.");
        await ensureAppointmentsTable();
        result = await query(
          'INSERT INTO appointments (user_id, title, with_whom, topic, location, datetime, duration_minutes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [user.userId, sanitizedTitle, withWhom ?? null, topic ?? null, location ?? null, datetime, parsedDuration]
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
    
    const { id, title, datetime, durationMinutes, withWhom, topic, location } = body;
    
    // Validation
    if (!id || typeof id !== "string" || !isUuid(id)) {
      return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 });
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

    if (durationMinutes !== undefined) {
      const parsedDuration = Number(durationMinutes);
      if (!Number.isInteger(parsedDuration) || parsedDuration <= 0 || parsedDuration > 12 * 60) {
        return NextResponse.json({ error: "Invalid durationMinutes" }, { status: 400 });
      }
    }

    if (withWhom !== undefined) {
      if (withWhom === null || typeof withWhom !== "string" || withWhom.trim().length === 0) {
        return NextResponse.json({ error: "withWhom is required - who is the meeting with?" }, { status: 400 });
      }
    }

    if (topic !== undefined && topic !== null && typeof topic !== "string") {
      return NextResponse.json({ error: "topic must be a string" }, { status: 400 });
    }

    if (location !== undefined && location !== null && typeof location !== "string") {
      return NextResponse.json({ error: "location must be a string" }, { status: 400 });
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

    if (durationMinutes !== undefined) {
      updates.push(`duration_minutes = $${paramIndex++}`);
      values.push(Number(durationMinutes));
    }

    if (withWhom !== undefined) {
      updates.push(`with_whom = $${paramIndex++}`);
      values.push(withWhom);
    }

    if (topic !== undefined) {
      updates.push(`topic = $${paramIndex++}`);
      values.push(topic);
    }

    if (location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(location);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    
    // Add user_id and id to parameters
    values.push(user.userId);
    values.push(id);
    
    console.log(`🔄 Updating appointment ${id} for user: ${user.userId}`);
    if (datetime || durationMinutes !== undefined) {
      const existing = await query(
        'SELECT datetime, duration_minutes FROM appointments WHERE user_id = $1 AND id = $2',
        [user.userId, id]
      );
      const existingRow = existing.rows[0];
      if (!existingRow) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
      }

      const conflictStart = new Date(datetime ?? existingRow.datetime);
      const durationForCheck =
        durationMinutes !== undefined ? Number(durationMinutes) : Number(existingRow.duration_minutes || 30);
      const conflictEnd = new Date(conflictStart.getTime() + durationForCheck * 60 * 1000);

      const conflicts = await query(
        `SELECT id, title, datetime, duration_minutes
         FROM appointments
         WHERE user_id = $1
           AND id <> $2
           AND datetime < $3
           AND (datetime + (COALESCE(duration_minutes, 30) || ' minutes')::interval) > $4
         ORDER BY datetime ASC
         LIMIT 1`,
        [user.userId, id, conflictEnd.toISOString(), conflictStart.toISOString()]
      );

      if (conflicts.rows.length > 0) {
        return NextResponse.json(
          { error: "Conflicting appointment", conflict: conflicts.rows[0] },
          { status: 409 }
        );
      }
    }

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
    if (error instanceof Error && error.message.includes("invalid input syntax for type uuid")) {
      return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 });
    }
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
    
    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 });
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
    if (error instanceof Error && error.message.includes("invalid input syntax for type uuid")) {
      return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
  }
}
