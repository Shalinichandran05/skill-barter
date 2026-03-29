// config/db.js
// PostgreSQL connection pool via 'pg', connecting to Supabase.
// Wraps the interface to be compatible with the existing mysql2 query patterns.

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

// Verify connectivity on startup
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅  PostgreSQL (Supabase) connected successfully');
    client.release();
  } catch (err) {
    console.error('❌  PostgreSQL connection failed:', err.message);
    process.exit(1);
  }
})();

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
