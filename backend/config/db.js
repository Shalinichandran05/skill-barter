// config/db.js
// PostgreSQL connection pool via 'pg', connecting to Supabase.
// Wraps the interface to be compatible with the existing mysql2 query patterns.

const { Pool } = require('pg');
require('dotenv').config();

// Auto-append pgbouncer and sslmode for Supabase Pooler URLs (Port 6543)
let dbUrl = process.env.SUPABASE_DB_URL;
if (dbUrl && dbUrl.includes('pooler.supabase.com') && dbUrl.includes(':6543')) {
  if (!dbUrl.includes('pgbouncer=true')) {
    const separator = dbUrl.includes('?') ? '&' : '?';
    dbUrl += `${separator}pgbouncer=true&sslmode=require`;
  }
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 2, // Limit pool size for Serverless environments to prevent connection exhaustion
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Quick timeout to prevent Vercel 15s hangs
});

// Note: Removed the top-level IIFE that called `client.connect()` and `process.exit(1)`.
// Serverless functions (Vercel) should connect dynamically per request, otherwise 
// a slow connection attempt on cold start can crash the entire function container.
// It can also exhaust connection pools rapidly across multiple Vercel instances.

/**
 * Compatibility wrapper so controllers keep the same
 * const [rows] = await db.query(...)  and
 * const [[row]] = await db.query(...)  patterns as before.
 */
const db = {
  // Returns [rows] — first element is the rows array
  query: async (text, params) => {
    const { rows } = await pool.query(text, params);
    return [rows];
  },

  // Returns a transaction-capable client with the same API as mysql2 pool connection
  getConnection: async () => {
    const client = await pool.connect();
    return {
      query: async (text, params) => {
        const { rows } = await client.query(text, params);
        return [rows];
      },
      beginTransaction: () => client.query('BEGIN'),
      commit:           () => client.query('COMMIT'),
      rollback:         () => client.query('ROLLBACK'),
      release:          () => client.release(),
    };
  },
};

module.exports = db;
