import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// POST - Store user feedback for RLHF
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { 
      messageId, 
      feedback, 
      userMessage, 
      assistantResponse, 
      action,
      actionType,
      correction
    } = await req.json();
    
    // Validation
    if (!messageId || !feedback || !userMessage || !assistantResponse) {
      return NextResponse.json({ 
        error: "Missing required fields" 
      }, { status: 400 });
    }
    
    if (feedback !== "up" && feedback !== "down") {
      return NextResponse.json({ 
        error: "Invalid feedback value" 
      }, { status: 400 });
    }
    
    console.log(`📊 Feedback: ${feedback} from user ${user.userId} for message ${messageId}`);
    
    // Store feedback in database
    await query(
      `INSERT INTO feedback (
        user_id, 
        message_id, 
        feedback, 
        user_message, 
        assistant_response, 
        action_type, 
        action_data,
        correction
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.userId,
        messageId,
        feedback,
        userMessage,
        assistantResponse,
        action?.type || null,
        action ? JSON.stringify(action) : null,
        correction || null,
      ]
    );
    
    console.log(`✅ Feedback stored successfully`);
    
    return NextResponse.json({ 
      success: true,
      message: "Feedback recorded. Thank you!" 
    });
    
  } catch (error) {
    console.error("❌ Error storing feedback:", error);
    return NextResponse.json({ 
      error: "Failed to store feedback" 
    }, { status: 500 });
  }
}

// GET - Retrieve feedback analytics (admin/analysis endpoint)
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'summary' or 'detailed'
    
    if (type === 'summary') {
      // Get aggregated feedback stats
      const result = await query(
        `SELECT 
          COUNT(*) as total_feedback,
          COUNT(CASE WHEN feedback = 'up' THEN 1 END) as thumbs_up,
          COUNT(CASE WHEN feedback = 'down' THEN 1 END) as thumbs_down,
          action_type,
          ROUND(
            COUNT(CASE WHEN feedback = 'up' THEN 1 END)::numeric / 
            NULLIF(COUNT(*)::numeric, 0) * 100, 
            1
          ) as approval_rate
        FROM feedback
        WHERE user_id = $1
        GROUP BY action_type
        ORDER BY total_feedback DESC`,
        [user.userId]
      );
      
      return NextResponse.json({ 
        summary: result.rows,
        generated_at: new Date().toISOString()
      });
    } else {
      // Get recent feedback entries
      const result = await query(
        `SELECT 
          message_id,
          feedback,
          user_message,
          assistant_response,
          action_type,
          created_at
        FROM feedback
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50`,
        [user.userId]
      );
      
      return NextResponse.json({ 
        feedback: result.rows,
        count: result.rows.length
      });
    }
    
  } catch (error) {
    console.error("❌ Error retrieving feedback:", error);
    return NextResponse.json({ 
      error: "Failed to retrieve feedback" 
    }, { status: 500 });
  }
}
