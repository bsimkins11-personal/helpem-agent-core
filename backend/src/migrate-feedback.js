// Simple migration endpoint to create feedback table
// Run this once by visiting: https://your-backend.railway.app/migrate-feedback

import { pool } from './lib/db.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function migrateFeedbackTable() {
  try {
    console.log('🔍 Checking if feedback table exists...');
    
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'feedback'
      );
    `);

    if (checkResult.rows[0].exists) {
      return {
        success: true,
        message: 'Feedback table already exists',
        alreadyExists: true
      };
    }

    console.log('📝 Creating feedback table...');
    
    // Read and execute migration SQL
    const migrationPath = join(__dirname, '../migrations/add-feedback-table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);

    console.log('✅ Feedback table created successfully');

    // Verify creation
    const verifyResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'feedback'
      ORDER BY ordinal_position;
    `);

    return {
      success: true,
      message: 'Feedback table created successfully',
      columns: verifyResult.rows
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
