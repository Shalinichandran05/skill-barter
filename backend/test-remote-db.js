const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const client = await pool.connect();
    
    // Check if users table exists and its columns
    const { rows: columns } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    
    if (columns.length === 0) {
      console.log('NO USERS TABLE FOUND IN SUPABASE!');
    } else {
      console.log('Columns in users table:', columns.map(c => c.column_name).join(', '));
    }

    client.release();
    process.exit(0);
  } catch (err) {
    console.error('DB Error:', err.message);
    process.exit(1);
  }
})();
