/**
 * Migration 016: Partial loyalty points redemption
 * Adds loyalty_points_redeemed to orders so we can track how many points
 * were used as a discount and refund them on cancellation.
 */

const up = async (pool) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0
    `);
    await client.query('COMMIT');
    console.log('✅ Migration 016: loyalty_points_redeemed column added to orders');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { up };
