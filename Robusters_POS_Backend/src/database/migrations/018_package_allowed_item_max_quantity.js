/**
 * Migration 018: Per-allowed-item quantity cap
 *
 * package_allowed_items had no way to say "at most N of this item per
 * order" — a package could allow an item but a customer could order any
 * quantity of it against a single meal credit. Adds an optional
 * max_quantity (NULL = unlimited, matching today's behavior for existing
 * rows).
 */

const up = async (pool) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE package_allowed_items ADD COLUMN IF NOT EXISTS max_quantity INTEGER
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE package_allowed_items
          ADD CONSTRAINT max_quantity_positive CHECK (max_quantity IS NULL OR max_quantity > 0);
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('Migration 018: package_allowed_items.max_quantity added');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { up };

// Allow running directly: node src/database/migrations/018_package_allowed_item_max_quantity.js
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
