require('dotenv').config();
const { Pool } = require('pg');

const up = async (pool) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Enable trigram extension — makes ILIKE '%term%' use GIN indexes instead of full table scans
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // Customers — searched by name, phone, email
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm
        ON customers USING GIN (phone gin_trgm_ops)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_first_name_trgm
        ON customers USING GIN (first_name gin_trgm_ops)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_last_name_trgm
        ON customers USING GIN (last_name gin_trgm_ops)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_email_trgm
        ON customers USING GIN (email gin_trgm_ops)
    `);

    // Orders — searched by order_number, customer_phone, customer_name
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_order_number_trgm
        ON orders USING GIN (order_number gin_trgm_ops)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_customer_phone_trgm
        ON orders USING GIN (customer_phone gin_trgm_ops)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_customer_name_trgm
        ON orders USING GIN (customer_name gin_trgm_ops)
    `);

    // Menu items — searched by name and description
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_menu_items_name_trgm
        ON menu_items USING GIN (name gin_trgm_ops)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_menu_items_description_trgm
        ON menu_items USING GIN (description gin_trgm_ops)
    `);

    await client.query('COMMIT');
    console.log('Migration 013: search trigram indexes created');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const down = async (pool) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DROP INDEX IF EXISTS idx_customers_phone_trgm`);
    await client.query(`DROP INDEX IF EXISTS idx_customers_first_name_trgm`);
    await client.query(`DROP INDEX IF EXISTS idx_customers_last_name_trgm`);
    await client.query(`DROP INDEX IF EXISTS idx_customers_email_trgm`);
    await client.query(`DROP INDEX IF EXISTS idx_orders_order_number_trgm`);
    await client.query(`DROP INDEX IF EXISTS idx_orders_customer_phone_trgm`);
    await client.query(`DROP INDEX IF EXISTS idx_orders_customer_name_trgm`);
    await client.query(`DROP INDEX IF EXISTS idx_menu_items_name_trgm`);
    await client.query(`DROP INDEX IF EXISTS idx_menu_items_description_trgm`);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { up, down };

// Allow running directly: node src/database/migrations/013_search_indexes.js
if (require.main === module) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  up(pool)
    .then(() => { console.log('Done.'); process.exit(0); })
    .catch((err) => { console.error(err); process.exit(1); });
}
