import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimiter";

// GET - Fetch user's habits
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      console.log('📭 No auth - returning empty habits');
      return NextResponse.json({ habits: [] });
    }
    
    console.log(`🔍 Fetching habits for user: ${user.userId}`);
    const result = await query(
      'SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC',
      [user.userId]
    );
    
    console.log(`✅ Found ${result.rows.length} habits for user`);
    return NextResponse.json({ habits: result.rows });
  } catch (error) {
    console.error("Error fetching habits:", error);
    return NextResponse.json({ error: "Failed to fetch habits" }, { status: 500 });
  }
}

// POST - Create new habit
export async function POST(req: Request) {
  console.log('🔵 ========================================');
  console.log('🔵 POST /api/habits - Request Received');
  console.log('🔵 ========================================');
  
  try {
    // 🛡️ Rate limiting
    const clientIp = getClientIdentifier(req);
    const rateLimit = await checkRateLimit({
      identifier: `habits:${clientIp}`,
      maxRequests: 50, // 50 habit creations per hour
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
      console.error('❌ UNAUTHORIZED');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.userId);
    
    const body = await req.json();
    console.log('📦 Request body:', body);
    
    const { title, frequency, daysOfWeek, completions } = body;
    
    // 🛡️ Input validation
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    
    if (title.length > 500) {
      return NextResponse.json({ error: "Title too long (max 500 characters)" }, { status: 400 });
    }
    
    const validFrequencies = ["daily", "weekly", "custom"];
    const sanitizedFrequency = validFrequencies.includes(frequency) ? frequency : "daily";
    
    // Sanitize title - remove HTML tags
    const sanitizedTitle = title.replace(/<[^>]*>/g, "").trim();
    
    // Validate daysOfWeek if provided
    const sanitizedDaysOfWeek = Array.isArray(daysOfWeek) ? daysOfWeek : [];
    
    // Validate completions if provided (should be JSON array)
    const sanitizedCompletions = Array.isArray(completions) ? completions : [];
    
    console.log(`➕ Creating habit for user: ${user.userId}`);
    console.log(`   Title: ${sanitizedTitle}`);
    console.log(`   Frequency: ${sanitizedFrequency}`);
    console.log(`   Days of Week: ${JSON.stringify(sanitizedDaysOfWeek)}`);
    
    const result = await query(
      'INSERT INTO habits (user_id, title, frequency, days_of_week, completions) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user.userId, sanitizedTitle, sanitizedFrequency, sanitizedDaysOfWeek, JSON.stringify(sanitizedCompletions)]
    );
    
    console.log('✅ Habit created successfully!');
    console.log('✅ Response data:', result.rows[0]);
    console.log('🔵 ========================================');
    
    return NextResponse.json({ habit: result.rows[0] });
  } catch (error) {
    console.error('🔴 ========================================');
    console.error("❌ Error creating habit:", error);
    console.error("❌ Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("❌ Error message:", error instanceof Error ? error.message : String(error));
    console.error('🔴 ========================================');
    
    // Don't expose internal error details to client
    if (error instanceof Error && error.message.includes("invalid input syntax")) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Failed to create habit" }, { status: 500 });
  }
}

// PATCH - Update existing habit (including logging completions)
export async function PATCH(req: Request) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id, title, frequency, daysOfWeek, completions, logCompletion } = await req.json();
    
    // Validation
    if (!id) {
      return NextResponse.json({ error: "Habit ID is required" }, { status: 400 });
    }
    
    if (title && typeof title !== "string") {
      return NextResponse.json({ error: "Title must be a string" }, { status: 400 });
    }
    
    if (title && title.length > 500) {
      return NextResponse.json({ error: "Title too long (max 500 characters)" }, { status: 400 });
    }
    
    if (frequency && !["daily", "weekly", "custom"].includes(frequency)) {
      return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
    }
    
    // Handle logging a new completion (special case)
    if (logCompletion) {
      console.log(`✅ Logging completion for habit ${id}`);
      
      // Fetch current habit to append completion
      const currentResult = await query(
        'SELECT completions FROM habits WHERE user_id = $1 AND id = $2',
        [user.userId, id]
      );
      
      if (currentResult.rows.length === 0) {
        return NextResponse.json({ error: "Habit not found" }, { status: 404 });
      }
      
      const currentCompletions = currentResult.rows[0].completions || [];
      const newCompletion = { date: new Date().toISOString() };
      const updatedCompletions = [...currentCompletions, newCompletion];
      
      const result = await query(
        'UPDATE habits SET completions = $1 WHERE user_id = $2 AND id = $3 RETURNING *',
        [JSON.stringify(updatedCompletions), user.userId, id]
      );
      
      console.log('✅ Completion logged successfully');
      return NextResponse.json({ habit: result.rows[0] });
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
    
    if (frequency) {
      updates.push(`frequency = $${paramIndex++}`);
      values.push(frequency);
    }
    
    if (daysOfWeek !== undefined) {
      updates.push(`days_of_week = $${paramIndex++}`);
      values.push(Array.isArray(daysOfWeek) ? daysOfWeek : []);
    }
    
    if (completions !== undefined) {
      updates.push(`completions = $${paramIndex++}`);
      values.push(JSON.stringify(Array.isArray(completions) ? completions : []));
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    
    values.push(user.userId);
    values.push(id);
    
    console.log(`🔄 Updating habit ${id} for user: ${user.userId}`);
    const result = await query(
      `UPDATE habits SET ${updates.join(', ')} WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }
    
    console.log('✅ Habit updated successfully');
    return NextResponse.json({ habit: result.rows[0] });
  } catch (error) {
    console.error("❌ Error updating habit:", error);
    return NextResponse.json({ error: "Failed to update habit" }, { status: 500 });
  }
}

// DELETE - Delete habit
export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "Habit ID is required" }, { status: 400 });
    }
    
    console.log(`🗑️ Deleting habit ${id} for user: ${user.userId}`);
    const result = await query(
      'DELETE FROM habits WHERE user_id = $1 AND id = $2 RETURNING *',
      [user.userId, id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }
    
    console.log('✅ Habit deleted successfully');
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error("❌ Error deleting habit:", error);
    return NextResponse.json({ error: "Failed to delete habit" }, { status: 500 });
  }
}
