import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// GET - Learning dashboard data
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get current metrics
    const current = await query(`
      SELECT 
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN feedback = 'up' THEN 1 END) as thumbs_up,
        COUNT(CASE WHEN feedback = 'down' THEN 1 END) as thumbs_down,
        ROUND(
          COUNT(CASE WHEN feedback = 'up' THEN 1 END)::numeric / 
          NULLIF(COUNT(*)::numeric, 0) * 100, 
          1
        ) as approval_rate
      FROM feedback
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    
    // Get trend over time
    const trend = await query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as feedback_count,
        ROUND(
          COUNT(CASE WHEN feedback = 'up' THEN 1 END)::numeric / 
          NULLIF(COUNT(*)::numeric, 0) * 100, 
          1
        ) as approval_rate
      FROM feedback
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `);
    
    // Get by action type
    const byAction = await query(`
      SELECT 
        COALESCE(action_type, 'unknown') as action_type,
        COUNT(*) as count,
        COUNT(CASE WHEN feedback = 'up' THEN 1 END) as thumbs_up,
        ROUND(
          COUNT(CASE WHEN feedback = 'up' THEN 1 END)::numeric / 
          NULLIF(COUNT(*)::numeric, 0) * 100, 
          1
        ) as approval_rate
      FROM feedback
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY action_type
      ORDER BY count DESC
    `);
    
    // Get common failures
    const failures = await query(`
      SELECT 
        user_message,
        COUNT(*) as frequency
      FROM feedback
      WHERE feedback = 'down'
        AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY user_message
      HAVING COUNT(*) > 1
      ORDER BY frequency DESC
      LIMIT 10
    `);
    
    // Calculate learning readiness
    const totalFeedback = parseInt(current.rows[0]?.total_feedback || 0);
    const approvalRate = parseFloat(current.rows[0]?.approval_rate || 0);
    
    const learningStatus = {
      ready_for_training: totalFeedback >= 500,
      feedback_count: totalFeedback,
      needed_for_training: Math.max(0, 500 - totalFeedback),
      approval_rate: approvalRate,
      health: approvalRate >= 85 ? 'excellent' : approvalRate >= 75 ? 'good' : 'needs_improvement'
    };
    
    return NextResponse.json({
      current: current.rows[0],
      trend: trend.rows,
      by_action: byAction.rows,
      common_failures: failures.rows,
      learning_status: learningStatus,
      generated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Error getting learning dashboard:", error);
    return NextResponse.json({ 
      error: "Failed to load dashboard" 
    }, { status: 500 });
  }
}
