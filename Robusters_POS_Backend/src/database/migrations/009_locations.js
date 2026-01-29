/**
 * Migration: Locations / Multi-Branch Support
 * Creates the locations table and adds location_id to orders.
 */

const createLocationsSchema = `
-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Auto-update updated_at on locations
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add location reference to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_location_id ON orders(location_id);
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active);
`;

module.exports = { createLocationsSchema };
