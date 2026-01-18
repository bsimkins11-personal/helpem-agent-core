import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimiter";

// GET - Fetch user's grocery items
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      console.log('📭 No auth - returning empty groceries');
      return NextResponse.json({ groceries: [] });
    }
    
    console.log(`🔍 Fetching groceries for user: ${user.userId}`);
    const result = await query(
      'SELECT * FROM groceries WHERE user_id = $1 ORDER BY created_at ASC',
      [user.userId]
    );
    
    console.log(`✅ Found ${result.rows.length} grocery items for user`);
    return NextResponse.json({ groceries: result.rows });
  } catch (error) {
    console.error("Error fetching groceries:", error);
    return NextResponse.json({ error: "Failed to fetch groceries" }, { status: 500 });
  }
}

// POST - Create new grocery item
export async function POST(req: Request) {
  console.log('🔵 ========================================');
  console.log('🔵 POST /api/groceries - Request Received');
  console.log('🔵 ========================================');
  
  try {
    // 🛡️ Rate limiting
    const clientIp = getClientIdentifier(req);
    console.log('🔍 Client IP:', clientIp);
    
    const rateLimit = await checkRateLimit({
      identifier: `groceries:${clientIp}`,
      maxRequests: 100, // 100 grocery items per hour
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.userId);
    
    const body = await req.json();
    console.log('📦 Request body:', body);
    
    const { content } = body;
    
    // 🛡️ Input validation
    if (!content || typeof content !== "string") {
      console.error('❌ Validation failed: Content missing or invalid');
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    
    if (content.length > 200) {
      console.error('❌ Validation failed: Content too long');
      return NextResponse.json({ error: "Content too long (max 200 characters)" }, { status: 400 });
    }
    
    // Sanitize content - remove HTML tags
    const sanitizedContent = content.replace(/<[^>]*>/g, "").trim();
    console.log('🧹 Sanitized content:', sanitizedContent);
    
    console.log(`➕ Inserting grocery item into database...`);
    console.log(`   User ID: ${user.userId}`);
    console.log(`   Content: ${sanitizedContent}`);
    
    const result = await query(
      'INSERT INTO groceries (user_id, content) VALUES ($1, $2) RETURNING *',
      [user.userId, sanitizedContent]
    );
    
    console.log('✅ Database INSERT successful!');
    console.log('✅ Returned grocery item:', result.rows[0]);
    console.log('🔵 ========================================');
    
    return NextResponse.json({ grocery: result.rows[0] });
  } catch (error) {
    console.error('🔴 ========================================');
    console.error("❌ CRITICAL ERROR in POST /api/groceries");
    console.error("❌ Error:", error);
    console.error('🔴 ========================================');
    
    return NextResponse.json({ error: "Failed to create grocery item" }, { status: 500 });
  }
}

// PATCH - Update existing grocery item (mark complete/incomplete, rename)
export async function PATCH(req: Request) {
  console.log('🔵 ========================================');
  console.log('🔵 PATCH /api/groceries - Request Received');
  console.log('🔵 ========================================');
  
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      console.error('❌ UNAUTHORIZED');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    console.log('📦 Request body:', body);
    
    const { id, content, completed } = body;
    
    // Validation
    if (!id) {
      return NextResponse.json({ error: "Grocery item ID is required" }, { status: 400 });
    }
    
    if (content !== undefined && typeof content !== "string") {
      return NextResponse.json({ error: "Content must be a string" }, { status: 400 });
    }
    
    if (content && content.length > 200) {
      return NextResponse.json({ error: "Content too long (max 200 characters)" }, { status: 400 });
    }
    
    if (completed !== undefined && typeof completed !== "boolean") {
      return NextResponse.json({ error: "Completed must be a boolean" }, { status: 400 });
    }
    
    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (content !== undefined) {
      const sanitizedContent = content.replace(/<[^>]*>/g, "").trim();
      updates.push(`content = $${paramIndex++}`);
      values.push(sanitizedContent);
    }
    
    if (completed !== undefined) {
      updates.push(`completed = $${paramIndex++}`);
      values.push(completed);
      
      if (completed) {
        updates.push(`completed_at = NOW()`);
      } else {
        updates.push(`completed_at = NULL`);
      }
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    
    // Add user_id and id to parameters
    values.push(user.userId);
    values.push(id);
    
    console.log(`🔄 Updating grocery item ${id} for user: ${user.userId}`);
    const result = await query(
      `UPDATE groceries SET ${updates.join(', ')} WHERE user_id = $${paramIndex} AND id = $${paramIndex + 1} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      console.error('❌ Grocery item not found or unauthorized');
      return NextResponse.json({ error: "Grocery item not found" }, { status: 404 });
    }
    
    console.log('✅ Grocery item updated successfully');
    console.log('🔵 ========================================');
    return NextResponse.json({ grocery: result.rows[0] });
  } catch (error) {
    console.error('🔴 ========================================');
    console.error("❌ Error updating grocery item:", error);
    console.error('🔴 ========================================');
    return NextResponse.json({ error: "Failed to update grocery item" }, { status: 500 });
  }
}

// DELETE - Delete grocery item
export async function DELETE(req: Request) {
  console.log('🔵 ========================================');
  console.log('🔵 DELETE /api/groceries - Request Received');
  console.log('🔵 ========================================');
  
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      console.error('❌ UNAUTHORIZED');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    console.log('🔍 Deleting grocery item ID:', id);
    
    if (!id) {
      return NextResponse.json({ error: "Grocery item ID is required" }, { status: 400 });
    }
    
    console.log(`🗑️ Deleting grocery item ${id} for user: ${user.userId}`);
    const result = await query(
      'DELETE FROM groceries WHERE user_id = $1 AND id = $2 RETURNING *',
      [user.userId, id]
    );
    
    if (result.rows.length === 0) {
      console.error('❌ Grocery item not found or unauthorized');
      return NextResponse.json({ error: "Grocery item not found" }, { status: 404 });
    }
    
    console.log('✅ Grocery item deleted successfully');
    console.log('🔵 ========================================');
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('🔴 ========================================');
    console.error("❌ Error deleting grocery item:", error);
    console.error('🔴 ========================================');
    return NextResponse.json({ error: "Failed to delete grocery item" }, { status: 500 });
  }
}
