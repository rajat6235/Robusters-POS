/**
 * Migration 017: Meal package fixes
 *
 * - Adds PACKAGE to the payment_method enum so a meal-package redemption can
 *   actually be recorded as an order (previously unrepresentable — every
 *   attempt failed with an invalid-enum-value error).
 * - Adds a UNIQUE constraint on package_meal_consumption.order_id so a
 *   retried "create order" request can't double-deduct a meal.
 * - Adds the missing index on customer_meal_packages(package_id), used by
 *   MealPackage.getStatistics().
 * - Tightens package_allowed_items so a row must reference exactly one of
 *   menu_item_id / category_id, not both at once.
 * - Adds an idempotency_keys table backing the Idempotency-Key middleware.
 */

const up = async (pool) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'PACKAGE'`);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE package_meal_consumption
          ADD CONSTRAINT package_meal_consumption_order_id_key UNIQUE (order_id);
      EXCEPTION
        WHEN duplicate_object OR duplicate_table THEN null;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_packages_package ON customer_meal_packages(package_id)
    `);

    await client.query(`
      ALTER TABLE package_allowed_items DROP CONSTRAINT IF EXISTS must_have_item_or_category
    `);
    await client.query(`
      ALTER TABLE package_allowed_items DROP CONSTRAINT IF EXISTS item_xor_category
    `);
    await client.query(`
      ALTER TABLE package_allowed_items ADD CONSTRAINT item_xor_category CHECK (
        (menu_item_id IS NOT NULL AND category_id IS NULL) OR
        (menu_item_id IS NULL AND category_id IS NOT NULL)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key VARCHAR(255) PRIMARY KEY,
        endpoint VARCHAR(255) NOT NULL,
        user_id UUID REFERENCES users(id),
        status_code INTEGER,
        response_body JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency_keys(created_at)
    `);

    await client.query('COMMIT');
    console.log('Migration 017: meal package fixes applied');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { up };

// Allow running directly: node src/database/migrations/017_meal_package_fixes.js
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
