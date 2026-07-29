/**
 * Migration 021: Meal package coverage on regular checkout order_items
 *
 * Lets the main "New Order" checkout (not just the dedicated meal-package
 * wizard) automatically redeem cart items against a customer's active
 * package. order_items.total_price already reflects only the *charged*
 * portion (quantity - package_covered_quantity) * unit_price — this column
 * records how many of the line's units were instead redeemed for free, so
 * the order still shows the full picture (what was received vs. what was
 * paid for).
 *
 * orders.customer_package_id / meals_consumed / is_package_order (added in
 * migration 013/017 for the dedicated flow) are reused as-is here — no
 * order-level schema change needed, only this line-item detail.
 */

const up = async (pool) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE order_items
        ADD COLUMN IF NOT EXISTS package_covered_quantity INTEGER NOT NULL DEFAULT 0
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE order_items
          ADD CONSTRAINT package_covered_quantity_valid
          CHECK (package_covered_quantity >= 0 AND package_covered_quantity <= quantity);
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('Migration 021: order_items.package_covered_quantity added');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { up };

// Allow running directly: node src/database/migrations/021_order_items_package_coverage.js
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
