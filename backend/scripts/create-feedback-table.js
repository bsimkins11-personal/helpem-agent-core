import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root
const envPath = join(__dirname, '../../.env');
console.log(`📂 Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env:', result.error);
  process.exit(1);
}

console.log(`✅ Loaded ${Object.keys(result.parsed || {}).length} environment variables`);

const { Pool } = pg;

async function createFeedbackTable() {
  // Use DATABASE_PUBLIC_URL if available, otherwise DATABASE_URL
  const databaseUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or DATABASE_PUBLIC_URL not set');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE')));
    process.exit(1);
  }

  // Trim any whitespace or quotes
  const cleanUrl = databaseUrl.trim().replace(/^["']|["']$/g, '');

  console.log('🔗 Connecting to Railway database...');
  console.log(`📍 URL length: ${cleanUrl.length} chars`);
  console.log(`📍 URL starts with: ${cleanUrl.substring(0, 20)}...`);
  console.log(`📍 URL type: ${typeof cleanUrl}`);
  
  if (!cleanUrl || cleanUrl === 'undefined' || cleanUrl === 'null') {
    console.error('❌ Database URL is invalid:', cleanUrl);
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Read the migration SQL
    const migrationPath = join(__dirname, '../migrations/add-feedback-table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('\n📋 Migration SQL:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));

    // Check if table already exists
    console.log('\n🔍 Checking if feedback table exists...');
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'feedback'
      );
    `);

    if (checkResult.rows[0].exists) {
      console.log('✅ Feedback table already exists!');
      
      // Show table structure
      const structureResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'feedback'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📊 Current table structure:');
      console.table(structureResult.rows);
      
      process.exit(0);
    }

    console.log('⚠️  Feedback table does not exist. Creating...\n');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Feedback table created successfully!');

    // Verify creation
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'feedback'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 New table structure:');
    console.table(verifyResult.rows);

    // Check indexes
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'feedback';
    `);

    console.log('\n🔑 Indexes created:');
    console.table(indexResult.rows);

    console.log('\n🎉 Migration complete! Feedback system is ready to use.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createFeedbackTable();
