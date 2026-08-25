import { Pool } from 'pg';

const connectionString = process.env.PG_URL;

if (!connectionString) {
  throw new Error('PG_URL is not defined');
}

export const pool = new Pool({
  connectionString,
  ssl: false,
});

export async function testDatabaseConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() as now');
    return result.rows[0];
  } finally {
    client.release();
  }
}
