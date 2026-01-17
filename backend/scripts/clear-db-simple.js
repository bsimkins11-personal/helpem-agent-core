// Simple script to clear database using pg directly
import pg from 'pg';

const { Pool } = pg;

async function clearDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🗑️  Clearing ALL test data from database...\n');

    const tables = ['habits', 'appointments', 'todos', 'user_inputs', 'user_instructions', 'chat_messages'];
    
    for (const table of tables) {
      const result = await pool.query(`DELETE FROM ${table}`);
      console.log(`✅ Deleted ${result.rowCount} rows from ${table}`);
    }

    console.log('\n✨ Database cleared successfully!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearDatabase();
