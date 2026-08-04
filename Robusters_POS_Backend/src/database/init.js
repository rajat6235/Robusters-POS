/**
 * Database Initialization Script
 * Creates the database and all required tables.
 * Run with: npm run db:init
 */

const { Pool } = require('pg');
require('dotenv').config();
const { createMenuSchema } = require('./migrations/002_menu_schema');
const { createOrderSchema } = require('./migrations/003_order_schema');
const { createCustomerTables } = require('./migrations/004_customer_system');
const { createActivityLogSchema } = require('./migrations/005_activity_log');
const { removeTaxCalculation } = require('./migrations/008_remove_tax_calculation');
const { createLocationsSchema } = require('./migrations/009_locations');
const { addLoyaltyPayment } = require('./migrations/010_loyalty_payment');
const { createSettingsSchema } = require('./migrations/011_settings');
const { up: addSearchIndexes } = require('./migrations/013_search_indexes');
const { up: addOrderNumberSequence } = require('./migrations/014_order_number_sequence');
const { up: fixOrderItemsFkey } = require('./migrations/015_order_items_menu_item_fkey');
const { up: addLoyaltyRedemption } = require('./migrations/016_loyalty_partial_redemption');
const { createMealPackagesSchema } = require('./migrations/013_meal_packages');
const { up: applyMealPackageFixes } = require('./migrations/017_meal_package_fixes');
const { up: addAllowedItemMaxQuantity } = require('./migrations/018_package_allowed_item_max_quantity');
const { up: dedupeAllowedItems } = require('./migrations/019_package_allowed_items_unique');
const { up: createIdempotencyKeys } = require('./migrations/020_idempotency_keys');
const { up: addOrderItemsPackageCoverage } = require('./migrations/021_order_items_package_coverage');
const { up: dedupeCustomerPackages } = require('./migrations/022_customer_meal_packages_unique_active');

const useSSL = process.env.DB_SSL === 'true';
const dbName = process.env.DB_NAME || 'robusters_pos';

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: dbName, // Connect directly to the target database (required for Neon)
  ssl: useSSL ? { rejectUnauthorized: false } : false,
};

// SQL to create tables
const createTablesSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM for user roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'MANAGER',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index on role for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
`;

async function initDatabase() {
  const pool = new Pool(config);

  try {
    console.log(`Connecting to database: ${dbName}...`);

    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log(`Connected successfully at: ${result.rows[0].now}`);

    console.log('Creating user tables...');
    await pool.query(createTablesSQL);
    console.log('User tables created successfully.');

    console.log('Creating menu tables...');
    await pool.query(createMenuSchema);
    console.log('Menu tables created successfully.');

    console.log('Creating order tables...');
    await pool.query(createOrderSchema);
    console.log('Order tables created successfully.');

    console.log('Creating customer tables...');
    await createCustomerTables(pool);
    console.log('Customer tables created successfully.');

    console.log('Creating activity log tables...');
    await pool.query(createActivityLogSchema);
    console.log('Activity log tables created successfully.');

    console.log('Removing tax calculation...');
    await pool.query(removeTaxCalculation);
    console.log('Tax calculation removed successfully.');

    console.log('Creating locations tables...');
    await pool.query(createLocationsSchema);
    console.log('Locations tables created successfully.');

    console.log('Adding loyalty payment method...');
    await pool.query(addLoyaltyPayment);
    console.log('Loyalty payment method added successfully.');

    console.log('Creating settings table...');
    await pool.query(createSettingsSchema);
    console.log('Settings table created successfully.');

    console.log('Adding search trigram indexes...');
    await addSearchIndexes(pool);
    console.log('Search trigram indexes added successfully.');

    console.log('Adding order number sequence table...');
    await addOrderNumberSequence(pool);
    console.log('Order number sequence table added successfully.');

    console.log('Fixing order_items menu_item_id foreign key...');
    await fixOrderItemsFkey(pool);
    console.log('order_items_menu_item_id_fkey set to ON DELETE SET NULL.');

    console.log('Adding loyalty_points_redeemed to orders...');
    await addLoyaltyRedemption(pool);
    console.log('loyalty_points_redeemed column added.');

    console.log('Creating meal packages tables...');
    await pool.query(createMealPackagesSchema);
    console.log('Meal packages tables created successfully.');

    console.log('Applying meal package fixes...');
    await applyMealPackageFixes(pool);
    console.log('Meal package fixes applied successfully.');

    console.log('Adding package allowed item max_quantity...');
    await addAllowedItemMaxQuantity(pool);
    console.log('package_allowed_items.max_quantity added successfully.');

    console.log('De-duplicating and constraining package_allowed_items...');
    await dedupeAllowedItems(pool);
    console.log('package_allowed_items deduplicated and constrained successfully.');

    console.log('Creating idempotency_keys table...');
    await createIdempotencyKeys(pool);
    console.log('idempotency_keys table created successfully.');

    console.log('Adding package coverage to order_items...');
    await addOrderItemsPackageCoverage(pool);
    console.log('order_items.package_covered_quantity added successfully.');

    console.log('De-duplicating and constraining customer_meal_packages...');
    await dedupeCustomerPackages(pool);
    console.log('customer_meal_packages deduplicated and constrained successfully.');

    await pool.end();
    console.log('\nDatabase initialization complete!');
    console.log('You can now run: npm run db:seed');

  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
}

initDatabase();
