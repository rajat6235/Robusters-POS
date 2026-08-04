/**
 * Migration 023: One active package per customer (DB-level backstop)
 *
 * assignPackage() now rejects a new assignment at the app level if the
 * customer already has any active package (see packageAssignmentController).
 * This migration adds the matching DB constraint so the rule holds even
 * under a race (two concurrent assign requests for the same customer), the
 * same way idx_customer_package_active_unique already does for the
 * narrower "same package twice" case.
 *
 * NOT wired into init.js yet. Unlike migration 022 (whose duplicates were
 * safe to auto-merge — identical values, no consumption history), a
 * customer legitimately having two *different* active packages needs a
 * human call on which one wins, not an automatic one. As of writing there
 * is one such case in production (customer phone 07837733549 — an active,
 * paid, partially-consumed package alongside a second, unpaid, unused one)
 * that a staff member needs to resolve via the dashboard's Cancel/Complete
 * actions before this can run — it deliberately fails loudly rather than
 * silently picking a side. Once that's clear, run this file directly and
 * then move the require/call into init.js alongside the other migrations.
 */

const up = async (pool) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const conflicts = await client.query(`
      SELECT customer_id, COUNT(*) AS active_count
      FROM customer_meal_packages
      WHERE status = 'active'
      GROUP BY customer_id
      HAVING COUNT(*) > 1
    `);

    if (conflicts.rows.length > 0) {
      throw new Error(
        `Migration 023 aborted: ${conflicts.rows.length} customer(s) currently have more than one active ` +
        `package (customer_id(s): ${conflicts.rows.map((r) => r.customer_id).join(', ')}). ` +
        `Resolve via the dashboard (Complete/Cancel one of each customer's duplicates) and re-run.`
      );
    }

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_one_active_package
        ON customer_meal_packages (customer_id)
        WHERE status = 'active'
    `);

    await client.query('COMMIT');
    console.log('Migration 023: one-active-package-per-customer constraint added');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { up };

// Allow running directly: node src/database/migrations/023_one_active_package_per_customer.js
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
