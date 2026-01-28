/**
 * Update Order Status Migration
 * Removes PENDING and COMPLETED statuses from order_status enum.
 */

const updateOrderStatusSchema = `
-- First, update any existing orders with PENDING status to PREPARING
UPDATE orders SET status = 'PREPARING' WHERE status = 'PENDING';

-- Update any existing orders with COMPLETED status to READY
UPDATE orders SET status = 'READY' WHERE status = 'COMPLETED';

-- Create new enum without PENDING and COMPLETED
DO $$ BEGIN
    -- Drop the old enum and create new one
    ALTER TYPE order_status RENAME TO order_status_old;
    CREATE TYPE order_status AS ENUM ('PREPARING', 'READY', 'CANCELLED');
    
    -- Update the column to use the new enum
    ALTER TABLE orders ALTER COLUMN status TYPE order_status USING status::text::order_status;
    
    -- Drop the old enum
    DROP TYPE order_status_old;
EXCEPTION
    WHEN others THEN
        -- If there's an error, rollback and show message
        RAISE NOTICE 'Could not update order_status enum. This might be expected if already updated.';
END $$;
`;

module.exports = {
  updateOrderStatusSchema,
};