// Continuous Learning Pipeline
// Automatically improves AI from user feedback
// Run via cron: */30 * * * * (every 30 minutes)

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const THRESHOLDS = {
  MIN_FEEDBACK_FOR_ANALYSIS: 50,      // Need at least 50 feedback items
  MIN_FEEDBACK_FOR_TRAINING: 500,     // Need 500+ for fine-tuning
  TARGET_APPROVAL_RATE: 85,           // Target 85% approval rate
  LOW_APPROVAL_THRESHOLD: 75,         // Alert if below 75%
};

async function runContinuousLearning() {
  const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    return;
  }
  
  console.log('🤖 Starting Continuous Learning Pipeline...');
  console.log(`📅 ${new Date().toISOString()}\n`);
  
  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    // Step 1: Analyze recent feedback
    const analysis = await analyzeFeedback(pool);
    console.log('📊 Feedback Analysis:', JSON.stringify(analysis, null, 2));
    
    // Step 2: Identify problem areas
    const issues = await identifyIssues(pool, analysis);
    if (issues.length > 0) {
      console.log('\n⚠️  Issues Detected:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    // Step 3: Check if we have enough data for improvement
    if (analysis.total_feedback >= THRESHOLDS.MIN_FEEDBACK_FOR_TRAINING) {
      console.log('\n✅ Sufficient feedback for model improvement');
      
      // Step 4: Generate training data
      const trainingData = await generateTrainingData(pool);
      console.log(`📝 Generated ${trainingData.length} training examples`);
      
      // Step 5: Save training snapshot
      const snapshotPath = await saveTrainingSnapshot(trainingData);
      console.log(`💾 Saved training snapshot: ${snapshotPath}`);
      
      // Step 6: Queue fine-tuning job (if configured)
      if (process.env.ENABLE_AUTO_FINETUNE === 'true') {
        await queueFineTuningJob(snapshotPath, analysis);
      } else {
        console.log('ℹ️  Auto fine-tuning disabled (set ENABLE_AUTO_FINETUNE=true)');
      }
    } else {
      const needed = THRESHOLDS.MIN_FEEDBACK_FOR_TRAINING - analysis.total_feedback;
      console.log(`\n📈 Need ${needed} more feedback items before training`);
    }
    
    // Step 7: Update learning metrics
    await updateMetrics(pool, analysis);
    
    console.log('\n✅ Pipeline complete!\n');
    
  } catch (error) {
    console.error('❌ Pipeline error:', error);
  } finally {
    await pool.end();
  }
}

async function analyzeFeedback(pool) {
  // Get overall stats
  const overall = await pool.query(`
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
  
  // Get stats by action type
  const byAction = await pool.query(`
    SELECT 
      action_type,
      COUNT(*) as count,
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
  
  return {
    total_feedback: parseInt(overall.rows[0]?.total_feedback || 0),
    thumbs_up: parseInt(overall.rows[0]?.thumbs_up || 0),
    thumbs_down: parseInt(overall.rows[0]?.thumbs_down || 0),
    approval_rate: parseFloat(overall.rows[0]?.approval_rate || 0),
    by_action: byAction.rows,
  };
}

async function identifyIssues(pool, analysis) {
  const issues = [];
  
  // Check overall approval rate
  if (analysis.approval_rate < THRESHOLDS.LOW_APPROVAL_THRESHOLD) {
    issues.push(`Overall approval rate ${analysis.approval_rate}% is below threshold`);
  }
  
  // Check each action type
  for (const action of analysis.by_action) {
    if (action.approval_rate < THRESHOLDS.LOW_APPROVAL_THRESHOLD) {
      issues.push(`${action.action_type} approval rate ${action.approval_rate}% is low`);
    }
  }
  
  // Find common failure patterns
  const failures = await pool.query(`
    SELECT 
      user_message,
      COUNT(*) as frequency
    FROM feedback
    WHERE feedback = 'down'
      AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY user_message
    HAVING COUNT(*) > 2
    ORDER BY frequency DESC
    LIMIT 5
  `);
  
  if (failures.rows.length > 0) {
    issues.push(`Found ${failures.rows.length} repeated failure patterns`);
  }
  
  return issues;
}

async function generateTrainingData(pool) {
  // Get positive feedback examples (for training)
  const positive = await pool.query(`
    SELECT 
      user_message,
      assistant_response,
      action_type,
      action_data
    FROM feedback
    WHERE feedback = 'up'
    ORDER BY created_at DESC
    LIMIT 1000
  `);
  
  // Format as training examples
  return positive.rows.map(row => ({
    messages: [
      { role: "user", content: row.user_message },
      { role: "assistant", content: row.assistant_response }
    ],
    metadata: {
      action_type: row.action_type,
      action_data: row.action_data,
    }
  }));
}

async function saveTrainingSnapshot(trainingData) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `training-snapshot-${timestamp}.jsonl`;
  const filepath = path.join(__dirname, '../training-snapshots', filename);
  
  // Create directory if it doesn't exist
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write JSONL format
  const lines = trainingData.map(example => JSON.stringify(example)).join('\n');
  fs.writeFileSync(filepath, lines);
  
  return filepath;
}

async function queueFineTuningJob(snapshotPath, analysis) {
  console.log('\n🚀 Queuing fine-tuning job...');
  
  // TODO: Integrate with OpenAI API or your ML platform
  // For now, just log what would happen
  
  const jobConfig = {
    training_file: snapshotPath,
    model: 'gpt-3.5-turbo',
    suffix: `helpem-auto-${Date.now()}`,
    hyperparameters: {
      n_epochs: 3,
      learning_rate_multiplier: 0.1,
    },
    metadata: {
      approval_rate: analysis.approval_rate,
      feedback_count: analysis.total_feedback,
      automated: true,
    }
  };
  
  console.log('📋 Job config:', JSON.stringify(jobConfig, null, 2));
  console.log('ℹ️  To enable: Set OPENAI_API_KEY and implement OpenAI integration');
}

async function updateMetrics(pool, analysis) {
  // Store learning metrics for tracking progress over time
  await pool.query(`
    INSERT INTO learning_metrics (
      total_feedback,
      approval_rate,
      thumbs_up,
      thumbs_down,
      action_breakdown,
      measured_at
    ) VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT DO NOTHING
  `, [
    analysis.total_feedback,
    analysis.approval_rate,
    analysis.thumbs_up,
    analysis.thumbs_down,
    JSON.stringify(analysis.by_action),
  ]).catch(() => {
    // Table might not exist yet, that's okay
    console.log('ℹ️  learning_metrics table not found (optional)');
  });
}

// Run the pipeline
runContinuousLearning();
