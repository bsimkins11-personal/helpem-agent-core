// Export feedback data for AI training/fine-tuning
// Usage: node backend/scripts/export-feedback-training-data.js > training-data.jsonl

const { Pool } = require('pg');

async function exportTrainingData() {
  const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or DATABASE_PUBLIC_URL not set');
    process.exit(1);
  }
  
  console.error('🔗 Connecting to database...');
  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    // Get all feedback with positive ratings for training
    const result = await pool.query(`
      SELECT 
        user_message as prompt,
        assistant_response as completion,
        action_type,
        action_data,
        feedback,
        created_at
      FROM feedback
      ORDER BY created_at DESC
    `);
    
    console.error(`📊 Found ${result.rows.length} feedback entries`);
    
    // Count stats
    const stats = {
      total: result.rows.length,
      thumbs_up: result.rows.filter(r => r.feedback === 'up').length,
      thumbs_down: result.rows.filter(r => r.feedback === 'down').length,
      by_action: {}
    };
    
    result.rows.forEach(row => {
      const type = row.action_type || 'none';
      if (!stats.by_action[type]) {
        stats.by_action[type] = { up: 0, down: 0, total: 0 };
      }
      stats.by_action[type].total++;
      stats.by_action[type][row.feedback === 'up' ? 'up' : 'down']++;
    });
    
    console.error('\n📈 Feedback Statistics:');
    console.error(`Total: ${stats.total}`);
    console.error(`👍 Thumbs Up: ${stats.thumbs_up} (${(stats.thumbs_up/stats.total*100).toFixed(1)}%)`);
    console.error(`👎 Thumbs Down: ${stats.thumbs_down} (${(stats.thumbs_down/stats.total*100).toFixed(1)}%)`);
    console.error('\nBy Action Type:');
    Object.entries(stats.by_action).forEach(([type, counts]) => {
      const rate = (counts.up / counts.total * 100).toFixed(1);
      console.error(`  ${type}: ${counts.total} total, ${rate}% approval`);
    });
    
    console.error('\n📄 Exporting training data...\n');
    
    // Export in JSONL format (one JSON object per line)
    // This format is used by OpenAI for fine-tuning
    result.rows.forEach(row => {
      const trainingExample = {
        messages: [
          {
            role: "user",
            content: row.prompt
          },
          {
            role: "assistant",
            content: row.completion
          }
        ],
        metadata: {
          feedback: row.feedback,
          action_type: row.action_type,
          created_at: row.created_at
        }
      };
      
      // Only export positive examples for training by default
      // Negative examples can be used for analysis
      if (row.feedback === 'up') {
        console.log(JSON.stringify(trainingExample));
      }
    });
    
    console.error('\n✅ Export complete!');
    console.error(`Generated ${stats.thumbs_up} positive training examples`);
    console.error('\nTo save to file:');
    console.error('  node backend/scripts/export-feedback-training-data.js > training-data.jsonl');
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

exportTrainingData();
