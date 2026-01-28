/**
 * Remove Order Status Migration
 * Completely removes the status column and enum from orders table.
 */

const removeOrderStatusSchema = `
-- Remove the status column from orders table
ALTER TABLE orders DROP COLUMN IF EXISTS status;

-- Drop the order_status enum type
DROP TYPE IF EXISTS order_status;
`;

module.exports = {
  removeOrderStatusSchema,
};