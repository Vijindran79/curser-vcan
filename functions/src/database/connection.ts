import { Pool } from 'pg';
import * as functions from 'firebase-functions';

// Cloud SQL PostgreSQL connection
// Connection uses Unix domain socket for Cloud SQL Auth proxy
const pool = new Pool({
  host: '/cloudsql/vcanship-onestop-logistics:us-central1:vcanship-db',
  database: 'vcanship_logistics',
  user: 'postgres',
  password: functions.config().cloudsql?.password || process.env.CLOUD_SQL_PASSWORD,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  // Enable SSL for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Test connection on startup
pool.on('connect', () => {
  console.log('[CloudSQL] New client connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[CloudSQL] Unexpected error on idle client', err);
  process.exit(-1);
});

// Export query function for easy database operations
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[CloudSQL] Query executed', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('[CloudSQL] Query error:', error);
    throw error;
  }
};

// Export transaction function
export const transaction = async (callback: (client: any) => Promise<any>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CloudSQL] Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;