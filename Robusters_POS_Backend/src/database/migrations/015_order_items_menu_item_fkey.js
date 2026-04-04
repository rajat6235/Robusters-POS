/**
 * Migration 015: Fix order_items so menu items can be deleted
 *
 * 1. Add item_name column — stores the name at time of order so it survives
 *    menu item deletion. Backfills existing rows from menu_items.
 * 2. Drop NOT NULL from menu_item_id — required for ON DELETE SET NULL to work.
 * 3. Change FK to ON DELETE SET NULL — deleting a menu item nullifies the
 *    reference but preserves all order history (name, price, qty).
 */

const up = async (pool) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add item_name column (idempotent)
    await client.query(`
      ALTER TABLE order_items
        ADD COLUMN IF NOT EXISTS item_name VARCHAR(255)
    `);

    // 2. Backfill item_name from menu_items for existing rows
    await client.query(`
      UPDATE order_items oi
      SET item_name = mi.name
      FROM menu_items mi
      WHERE oi.menu_item_id = mi.id
        AND oi.item_name IS NULL
    `);

    // 3. Drop NOT NULL from menu_item_id so SET NULL can work
    await client.query(`
      ALTER TABLE order_items
        ALTER COLUMN menu_item_id DROP NOT NULL
    `);

    // 4. Re-create FK with ON DELETE SET NULL (drop first so this is idempotent)
    await client.query(`
      ALTER TABLE order_items
        DROP CONSTRAINT IF EXISTS order_items_menu_item_id_fkey,
        ADD CONSTRAINT order_items_menu_item_id_fkey
          FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL
    `);

    await client.query('COMMIT');
    console.log('✅ Migration 015: order_items item_name added + menu_item_id made nullable with ON DELETE SET NULL');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { up };
