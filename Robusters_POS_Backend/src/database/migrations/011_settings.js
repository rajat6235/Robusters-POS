/**
 * Migration 011: Create settings table for configurable application settings
 */

const createSettingsSchema = `
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Auto-update trigger
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Seed default settings
INSERT INTO settings (key, value, description) VALUES
  ('loyalty_points_ratio', '{"spend_amount": 10, "points_earned": 1}',
   'How many loyalty points are earned per spend_amount rupees spent'),
  ('tier_thresholds', '{"bronze": 0, "silver": 2000, "gold": 5000, "platinum": 10000}',
   'Total spent thresholds for customer tier classification (Bronze, Silver, Gold, Platinum)'),
  ('vip_order_threshold', '{"min_orders": 10}',
   'Minimum number of orders for a customer to be considered VIP')
ON CONFLICT (key) DO NOTHING;
`;

module.exports = { createSettingsSchema };
