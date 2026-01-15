import { Pool } from 'pg';

// This uses the DATABASE_URL that Railway provides automatically
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export const query = (text: string, params?: unknown[]) => pool.query(text, params);
