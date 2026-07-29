/**
 * Migration 019: De-duplicate and constrain package_allowed_items
 *
 * bulkAddItems/addAllowedItem always used `ON CONFLICT DO NOTHING`, but
 * there was never an actual unique constraint backing it — so it was a
 * no-op and duplicate rows (same package + item + variant, or same
 * package + category) could pile up, e.g. from clicking "Add Items from
 * Category" twice or overlapping category selections.
 *
 * This migration:
 *  1. Removes existing duplicate rows, keeping the earliest one per group.
 *  2. Adds partial unique indexes covering the three legal row shapes
 *     (item+variant, item-only, category-only) so ON CONFLICT DO NOTHING
 *     actually has something to conflict against going forward.
 *
 * Partial (not a single flat UNIQUE) because `variant_id`/`category_id`
 * are nullable and a plain UNIQUE treats NULL as distinct from NULL —
 * two "any variant" rows for the same item would otherwise still be
 * allowed through.
 */

const up = async (pool) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Keep the earliest row per (package_id, menu_item_id, variant_id, category_id)
    // group — NULL-safe comparison via IS NOT DISTINCT FROM.
    await client.query(`
      DELETE FROM package_allowed_items a
      USING package_allowed_items b
      WHERE a.package_id = b.package_id
        AND a.menu_item_id IS NOT DISTINCT FROM b.menu_item_id
        AND a.variant_id IS NOT DISTINCT FROM b.variant_id
        AND a.category_id IS NOT DISTINCT FROM b.category_id
        AND (a.created_at > b.created_at OR (a.created_at = b.created_at AND a.id > b.id))
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_allowed_item_variant_unique
        ON package_allowed_items (package_id, menu_item_id, variant_id)
        WHERE menu_item_id IS NOT NULL AND variant_id IS NOT NULL
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_allowed_item_no_variant_unique
        ON package_allowed_items (package_id, menu_item_id)
        WHERE menu_item_id IS NOT NULL AND variant_id IS NULL
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_allowed_category_unique
        ON package_allowed_items (package_id, category_id)
        WHERE category_id IS NOT NULL
    `);

    await client.query('COMMIT');
    console.log('Migration 019: package_allowed_items deduplicated and constrained');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { up };

// Allow running directly: node src/database/migrations/019_package_allowed_items_unique.js
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
