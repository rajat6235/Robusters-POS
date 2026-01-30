const { Pool } = require('pg');

const up = async (pool) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Add order status and cancellation fields to orders table
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'CONFIRMED',
      ADD COLUMN IF NOT EXISTS cancellation_requested_by UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
      ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP
    `);
    
    // Add constraint for valid order statuses
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'check_order_status'
        ) THEN
          ALTER TABLE orders 
          ADD CONSTRAINT check_order_status 
          CHECK (status IN ('CONFIRMED', 'CANCELLED'));
        END IF;
      END $$;
    `);
    
    // Create order status history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        previous_status VARCHAR(50),
        new_status VARCHAR(50),
        changed_by UUID REFERENCES users(id),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Update existing orders to have CONFIRMED status
    await client.query(`
      UPDATE orders 
      SET status = 'CONFIRMED' 
      WHERE status IS NULL OR status = ''
    `);
    
    await client.query('COMMIT');
    console.log('Migration 012_order_cancellation completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 012_order_cancellation failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

const down = async (pool) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Drop order status history table
    await client.query('DROP TABLE IF EXISTS order_status_history');
    
    // Remove added columns from orders table
    await client.query(`
      ALTER TABLE orders 
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS cancellation_requested_by,
      DROP COLUMN IF EXISTS cancellation_requested_at,
      DROP COLUMN IF EXISTS cancellation_reason,
      DROP COLUMN IF EXISTS cancelled_by,
      DROP COLUMN IF EXISTS cancelled_at
    `);
    
    await client.query('COMMIT');
    console.log('Migration 012_order_cancellation rollback completed');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 012_order_cancellation rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { up, down };