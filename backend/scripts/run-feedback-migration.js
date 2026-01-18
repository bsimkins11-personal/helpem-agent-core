// Run feedback table migration
// Usage: node backend/scripts/run-feedback-migration.js

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or DATABASE_PUBLIC_URL not set');
    process.exit(1);
  }
  
  console.log('🔗 Connecting to database...');
  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/add-feedback-table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Running feedback table migration...');
    await pool.query(sql);
    
    console.log('✅ Feedback table created successfully');
    
    // Verify table exists
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'feedback'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Feedback table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n🎉 Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
