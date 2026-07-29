/**
 * Migration 020: Create idempotency_keys table
 *
 * Required by the idempotency middleware used on order-creation and
 * package-assignment endpoints. The table was referenced in the middleware
 * but never included in a migration, causing a 500 on any request that
 * sends an Idempotency-Key header.
 *
 * Keys expire after 24 hours (handled by the cleanup index + a periodic
 * DELETE — or simply let rows accumulate; the table stays small in practice
 * because keys are only held for the duration of a single user session).
 */

const up = async (pool) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key          VARCHAR(255) PRIMARY KEY,
        endpoint     VARCHAR(255) NOT NULL,
        user_id      UUID,
        status_code  INTEGER,
        response_body JSONB,
        created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index to make time-based cleanup fast
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
        ON idempotency_keys (created_at)
    `);

    await client.query('COMMIT');
    console.log('Migration 020: idempotency_keys table created');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { up };

// Allow running directly: node src/database/migrations/020_idempotency_keys.js
if (require.main === module) {
  require('dotenv').config();
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  up(pool)
    .then(() => { console.log('Done.'); process.exit(0); })
    .catch((err) => { console.error(err); process.exit(1); });
}
