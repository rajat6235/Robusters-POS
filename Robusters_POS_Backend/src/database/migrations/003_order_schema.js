/**
 * Order Schema Migration
 * Creates tables for orders and order items.
 */

const createOrderSchema = `
-- Create ENUM for order status
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ENUM for payment methods
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'UPI');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ENUM for payment status
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_phone VARCHAR(20),
    customer_name VARCHAR(100),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method payment_method NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    variant_ids JSONB DEFAULT '[]'::jsonb,
    addon_selections JSONB DEFAULT '[]'::jsonb,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);

-- Trigger to auto-update updated_at for orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate order totals when order items change
    UPDATE orders 
    SET 
        subtotal = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM order_items 
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        ),
        tax = (
            SELECT COALESCE(SUM(total_price), 0) * 0.05
            FROM order_items 
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        ),
        total = (
            SELECT COALESCE(SUM(total_price), 0) * 1.05
            FROM order_items 
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        )
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-calculate order totals
DROP TRIGGER IF EXISTS trigger_calculate_order_totals_insert ON order_items;
CREATE TRIGGER trigger_calculate_order_totals_insert
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_totals();

DROP TRIGGER IF EXISTS trigger_calculate_order_totals_update ON order_items;
CREATE TRIGGER trigger_calculate_order_totals_update
    AFTER UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_totals();

DROP TRIGGER IF EXISTS trigger_calculate_order_totals_delete ON order_items;
CREATE TRIGGER trigger_calculate_order_totals_delete
    AFTER DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_totals();
`;

module.exports = {
  createOrderSchema,
};