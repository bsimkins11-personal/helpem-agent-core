// Clear user_inputs table specifically
import pg from 'pg';
const { Pool } = pg;

async function clearUserInputs() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🗑️  Clearing user_inputs table...\n');

    const result = await pool.query('DELETE FROM user_inputs');
    console.log(`✅ Deleted ${result.rowCount} rows from user_inputs`);

    const result2 = await pool.query('DELETE FROM user_instructions');
    console.log(`✅ Deleted ${result2.rowCount} rows from user_instructions`);

    const result3 = await pool.query('DELETE FROM todos');
    console.log(`✅ Deleted ${result3.rowCount} rows from todos`);

    const result4 = await pool.query('DELETE FROM appointments');
    console.log(`✅ Deleted ${result4.rowCount} rows from appointments`);

    const result5 = await pool.query('DELETE FROM habits');
    console.log(`✅ Deleted ${result5.rowCount} rows from habits`);

    console.log('\n✨ All tables cleared!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearUserInputs();
