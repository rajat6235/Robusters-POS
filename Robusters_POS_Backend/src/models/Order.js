/**
 * Order Model
 * Handles database operations for orders and order items.
 */

const db = require('../database/connection');

// Valid payment methods
const PAYMENT_METHODS = {
  CASH: 'CASH',
  CARD: 'CARD',
  UPI: 'UPI',
};

// Valid payment statuses
const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
};

/**
 * Generate order number
 * Format: ORD-YYYYMMDD-XXXX
 */
const generateOrderNumber = async () => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get count of orders today
  const result = await db.query(
    `SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURRENT_DATE`
  );
  
  const count = parseInt(result.rows[0].count) + 1;
  return `ORD-${today}-${count.toString().padStart(4, '0')}`;
};

/**
 * Create a new order
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Created order with items
 */
const create = async ({
  customerPhone,
  customerName,
  items,
  subtotal,
  tax,
  total,
  paymentMethod,
  notes,
  createdBy,
}) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Generate order number
    const orderNumber = await generateOrderNumber();
    
    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number, customer_phone, customer_name, subtotal, tax, total,
        payment_method, payment_status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        orderNumber,
        customerPhone,
        customerName,
        subtotal,
        tax,
        total,
        paymentMethod,
        PAYMENT_STATUS.PENDING,
        notes,
        createdBy,
      ]
    );
    
    const order = orderResult.rows[0];
    
    // Create order items
    const orderItems = [];
    for (const item of items) {
      const itemResult = await client.query(
        `INSERT INTO order_items (
          order_id, menu_item_id, quantity, unit_price, total_price,
          variant_ids, addon_selections, special_instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          order.id,
          item.itemId,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
          JSON.stringify(item.variantIds || []),
          JSON.stringify(item.addonSelections || []),
          item.specialInstructions,
        ]
      );
      
      orderItems.push(itemResult.rows[0]);
    }
    
    await client.query('COMMIT');
    
    return {
      ...order,
      items: orderItems,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Find orders with pagination and filters
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Orders with pagination info
 */
const findAll = async ({
  page = 1,
  limit = 20,
  startDate,
  endDate,
  customerPhone,
} = {}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let paramIndex = 1;
  
  if (startDate) {
    conditions.push(`DATE(o.created_at) >= $${paramIndex}`);
    values.push(startDate);
    paramIndex++;
  }
  
  if (endDate) {
    conditions.push(`DATE(o.created_at) <= $${paramIndex}`);
    values.push(endDate);
    paramIndex++;
  }
  
  if (customerPhone) {
    conditions.push(`o.customer_phone ILIKE $${paramIndex}`);
    values.push(`%${customerPhone}%`);
    paramIndex++;
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
    values
  );
  
  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);
  
  // Get orders
  const ordersResult = await db.query(
    `SELECT o.*, u.first_name, u.last_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.created_by
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );
  
  return {
    orders: ordersResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Find order by ID with items
 * @param {string} id - Order UUID
 * @returns {Promise<Object|null>} Order with items or null
 */
const findById = async (id) => {
  // Get order
  const orderResult = await db.query(
    `SELECT o.*, u.first_name, u.last_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.created_by
     WHERE o.id = $1`,
    [id]
  );
  
  if (orderResult.rows.length === 0) {
    return null;
  }
  
  const order = orderResult.rows[0];
  
  // Get order items with menu item details
  const itemsResult = await db.query(
    `SELECT oi.*, mi.name as item_name, mi.diet_type
     FROM order_items oi
     JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE oi.order_id = $1
     ORDER BY oi.created_at`,
    [id]
  );
  
  return {
    ...order,
    items: itemsResult.rows,
  };
};

/**
 * Update payment status
 * @param {string} id - Order UUID
 * @param {string} paymentStatus - New payment status
 * @returns {Promise<Object>} Updated order
 */
const updatePaymentStatus = async (id, paymentStatus) => {
  const result = await db.query(
    `UPDATE orders 
     SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [paymentStatus, id]
  );
  
  return result.rows[0];
};

/**
 * Get order statistics
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Order statistics
 */
const getStats = async ({ startDate, endDate } = {}) => {
  const conditions = [];
  const values = [];
  let paramIndex = 1;
  
  if (startDate) {
    conditions.push(`DATE(created_at) >= $${paramIndex}`);
    values.push(startDate);
    paramIndex++;
  }
  
  if (endDate) {
    conditions.push(`DATE(created_at) <= $${paramIndex}`);
    values.push(endDate);
    paramIndex++;
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get basic stats
  const statsResult = await db.query(
    `SELECT 
       COUNT(*) as total_orders,
       COALESCE(SUM(total), 0) as total_revenue,
       COALESCE(AVG(total), 0) as average_order_value
     FROM orders ${whereClause}`,
    values
  );
  
  // Get status breakdown
  const statusResult = await db.query(
    `SELECT status, COUNT(*) as count
     FROM orders ${whereClause}
     GROUP BY status`,
    values
  );
  
  // Get daily stats
  const dailyResult = await db.query(
    `SELECT 
       DATE(created_at) as date,
       COUNT(*) as orders,
       COALESCE(SUM(total), 0) as revenue
     FROM orders ${whereClause}
     GROUP BY DATE(created_at)
     ORDER BY DATE(created_at) DESC
     LIMIT 30`,
    values
  );
  
  const stats = statsResult.rows[0];
  const statusBreakdown = {};
  
  // Initialize all statuses with 0
  Object.values(ORDER_STATUS).forEach(status => {
    statusBreakdown[status] = 0;
  });
  
  // Fill in actual counts
  statusResult.rows.forEach(row => {
    statusBreakdown[row.status] = parseInt(row.count);
  });
  
  return {
    totalOrders: parseInt(stats.total_orders),
    totalRevenue: parseFloat(stats.total_revenue),
    averageOrderValue: parseFloat(stats.average_order_value),
    statusBreakdown,
    dailyStats: dailyResult.rows.map(row => ({
      date: row.date,
      orders: parseInt(row.orders),
      revenue: parseFloat(row.revenue),
    })),
  };
};

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  create,
  findAll,
  findById,
  updatePaymentStatus,
  getStats,
};