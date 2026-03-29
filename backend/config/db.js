// config/db.js
// MySQL connection pool using mysql2/promise
// Uses environment variables – never hard-code credentials.

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               process.env.DB_PORT     || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'skillbarter',
  waitForConnections: true,
  connectionLimit:    10,       // max simultaneous connections
  queueLimit:         0,
  timezone:           'local',  // use system local timezone
});

// Verify connectivity on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅  MySQL connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌  MySQL connection failed:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;
