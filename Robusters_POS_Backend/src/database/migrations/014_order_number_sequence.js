/**
 * Migration 014: Order Number Sequence Table
 * Replaces COUNT(*)-based order number generation with an atomic counter table.
 * Eliminates the TOCTOU race condition that caused duplicate order numbers
 * under concurrent requests.
 */

const up = async (pool) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Atomic per-day counter — row-level locking prevents duplicate numbers
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_number_counters (
        date_key DATE PRIMARY KEY,
        counter  INTEGER NOT NULL DEFAULT 0
      )
    `);

    await client.query('COMMIT');
    console.log('Migration 014: order_number_counters table created.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { up };

// Self-execute when run directly: node src/database/migrations/014_order_number_sequence.js
if (require.main === module) {
  const { Pool } = require('pg');
  require('dotenv').config();
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  up(pool)
    .then(() => pool.end())
    .catch((err) => { console.error(err); process.exit(1); });
}
