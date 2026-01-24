const { Pool } = require('pg');

const createCustomerTables = async (pool) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create customers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        date_of_birth DATE,
        total_orders INTEGER DEFAULT 0,
        total_spent DECIMAL(12,2) DEFAULT 0,
        loyalty_points INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create customer preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_preferences (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        dietary_restrictions TEXT[],
        allergies TEXT[],
        favorite_items UUID[],
        preferred_payment_method VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create customer orders junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id, order_id)
      );
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
      CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
      CREATE INDEX IF NOT EXISTS idx_customer_orders_customer_id ON customer_orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_customer_orders_order_id ON customer_orders(order_id);
    `);

    // Add customer_id to orders table if not exists
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
    `);

    await client.query('COMMIT');
    console.log('✅ Customer system tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating customer tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { createCustomerTables };