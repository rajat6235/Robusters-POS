/**
 * Migration 022: Prevent duplicate active package assignments
 *
 * assignPackage() had no guard at all against assigning the same package to
 * the same customer more than once — no app-level check, no DB constraint.
 * In production this let a customer end up with several identical *active*
 * rows for one package (e.g. staff double-clicking "Assign" because the
 * page they landed on afterward didn't reflect the new assignment, so it
 * looked like nothing had happened).
 *
 * This migration:
 *  1. Cleans up existing duplicate active assignments — per
 *     (customer_id, package_id) group, keeps whichever row actually has
 *     consumption history (if any), tie-broken by earliest assigned_at, and
 *     removes the rest. package_meal_consumption cascades on delete, but
 *     preferring the row with history avoids losing it in the common case.
 *  2. Adds a partial unique index so a customer can only have one *active*
 *     assignment per package going forward — once that assignment is
 *     completed or cancelled, a new one for the same package is allowed
 *     again (e.g. they finish a package and buy another).
 */

const up = async (pool) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      WITH ranked AS (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY customer_id, package_id
            ORDER BY
              EXISTS (
                SELECT 1 FROM package_meal_consumption pmc
                WHERE pmc.customer_package_id = customer_meal_packages.id
              ) DESC,
              assigned_at ASC,
              id ASC
          ) AS rn
        FROM customer_meal_packages
        WHERE status = 'active'
      )
      DELETE FROM customer_meal_packages
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_package_active_unique
        ON customer_meal_packages (customer_id, package_id)
        WHERE status = 'active'
    `);

    await client.query('COMMIT');
    console.log('Migration 022: duplicate active assignments cleaned up and constrained');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { up };

// Allow running directly: node src/database/migrations/022_customer_meal_packages_unique_active.js
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
