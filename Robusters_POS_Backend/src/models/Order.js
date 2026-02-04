/**
 * Order Model
 * Handles database operations for orders and order items.
 */

const db = require('../database/connection');
const ActivityLog = require('./ActivityLog');

// Valid payment methods
const PAYMENT_METHODS = {
  CASH: 'CASH',
  CARD: 'CARD',
  UPI: 'UPI',
  LOYALTY: 'LOYALTY',
};

// Valid payment statuses
const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
};

// Valid order statuses
const ORDER_STATUS = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
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
  customerId,
  items,
  subtotal,
  tax,
  total,
  paymentMethod,
  notes,
  createdBy,
  locationId,
}) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number, customer_phone, customer_name, customer_id, subtotal, tax, total,
        payment_method, payment_status, status, notes, created_by, location_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        orderNumber,
        customerPhone,
        customerName,
        customerId,
        subtotal,
        tax,
        total,
        paymentMethod,
        PAYMENT_STATUS.PENDING,
        ORDER_STATUS.CONFIRMED,
        notes,
        createdBy,
        locationId || null,
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
    
    // Log activity after successful commit
    try {
      await ActivityLog.create({
        userId: createdBy,
        action: ActivityLog.ACTIONS.ORDER_CREATED,
        details: {
          orderId: order.id,
          orderNumber: order.order_number,
          customerPhone: customerPhone,
          customerName: customerName,
          total: parseFloat(total),
          paymentMethod: paymentMethod,
          itemCount: items.length,
          locationId: locationId
        }
      });
    } catch (logError) {
      console.error('Failed to log order creation activity:', logError);
    }
    
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
    `SELECT o.*, u.first_name, u.last_name, l.name as location_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.created_by
     LEFT JOIN locations l ON l.id = o.location_id
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
    `SELECT o.*, u.first_name, u.last_name, l.name as location_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.created_by
     LEFT JOIN locations l ON l.id = o.location_id
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
 * Request order cancellation
 * @param {string} orderId - Order UUID
 * @param {string} managerId - Manager user UUID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Updated order with refund info
 */
const requestCancellation = async (orderId, managerId, reason) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Check if order exists and is CONFIRMED
    const orderCheck = await client.query(
      'SELECT id, status, total, payment_status, payment_method, customer_id FROM orders WHERE id = $1',
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const order = orderCheck.rows[0];
    
    if (order.status !== ORDER_STATUS.CONFIRMED) {
      throw new Error('Only confirmed orders can be cancelled');
    }
    
    if (order.cancellation_requested_by) {
      throw new Error('Cancellation already requested for this order');
    }
    
    // Update order with cancellation request
    const result = await client.query(
      `UPDATE orders 
       SET cancellation_requested_by = $1, 
           cancellation_requested_at = CURRENT_TIMESTAMP,
           cancellation_reason = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [managerId, reason, orderId]
    );
    
    // Log status history
    await client.query(
      `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, order.status, 'CANCELLATION_REQUESTED', managerId, reason]
    );
    
    await client.query('COMMIT');
    
    // Log activity after successful commit
    try {
      await ActivityLog.create({
        userId: managerId,
        action: ActivityLog.ACTIONS.ORDER_CANCELLATION_REQUESTED,
        details: {
          orderId: orderId,
          orderNumber: result.rows[0].order_number,
          reason: reason,
          orderTotal: parseFloat(order.total),
          paymentMethod: order.payment_method
        }
      });
    } catch (logError) {
      console.error('Failed to log cancellation request activity:', logError);
    }
    
    // Add refund information to the response
    const updatedOrder = result.rows[0];
    updatedOrder.refund_info = {
      payment_method: order.payment_method,
      amount: parseFloat(order.total),
      loyalty_points: order.payment_method === 'LOYALTY' ? parseFloat(order.total) : 0
    };
    
    return updatedOrder;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Approve or reject order cancellation
 * @param {string} orderId - Order UUID
 * @param {string} adminId - Admin user UUID
 * @param {boolean} approved - Whether to approve or reject
 * @param {string} adminNotes - Admin notes
 * @returns {Promise<Object>} Updated order with refund info
 */
const approveCancellation = async (orderId, adminId, approved, adminNotes = '') => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Check if order exists and has cancellation requested
    const orderCheck = await client.query(
      'SELECT id, status, total, payment_status, payment_method, customer_id, cancellation_requested_by FROM orders WHERE id = $1',
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const order = orderCheck.rows[0];
    
    if (!order.cancellation_requested_by) {
      throw new Error('No cancellation request found for this order');
    }
    
    if (order.status === ORDER_STATUS.CANCELLED) {
      throw new Error('Order is already cancelled');
    }
    
    let result;
    let refundInfo = null;
    
    if (approved) {
      // Cancel the order
      result = await client.query(
        `UPDATE orders 
         SET status = $1,
             cancelled_by = $2,
             cancelled_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [ORDER_STATUS.CANCELLED, adminId, orderId]
      );
      
      // Handle loyalty points refund if applicable
      if (order.payment_method === 'LOYALTY' && order.customer_id) {
        const loyaltyPointsToRefund = parseFloat(order.total);
        
        // Add loyalty points back to customer
        await client.query(
          'UPDATE customers SET loyalty_points = loyalty_points + $1 WHERE id = $2',
          [loyaltyPointsToRefund, order.customer_id]
        );
        
        refundInfo = {
          payment_method: 'LOYALTY',
          loyalty_points_refunded: loyaltyPointsToRefund,
          amount: parseFloat(order.total)
        };
      } else {
        refundInfo = {
          payment_method: order.payment_method,
          amount: parseFloat(order.total),
          loyalty_points_refunded: 0
        };
      }
      
      // Log status history
      await client.query(
        `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED, adminId, `Approved: ${adminNotes}`]
      );
      
    } else {
      // Reject cancellation - clear cancellation request fields
      result = await client.query(
        `UPDATE orders 
         SET cancellation_requested_by = NULL,
             cancellation_requested_at = NULL,
             cancellation_reason = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [orderId]
      );
      
      // Log status history
      await client.query(
        `INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, 'CANCELLATION_REQUESTED', ORDER_STATUS.CONFIRMED, adminId, `Rejected: ${adminNotes}`]
      );
    }
    
    await client.query('COMMIT');
    
    // Log activity after successful commit
    try {
      const activityAction = approved 
        ? ActivityLog.ACTIONS.ORDER_CANCELLATION_APPROVED 
        : ActivityLog.ACTIONS.ORDER_CANCELLATION_REJECTED;
      
      const activityDetails = {
        orderId: orderId,
        orderNumber: result.rows[0].order_number,
        adminNotes: adminNotes,
        orderTotal: parseFloat(order.total),
        paymentMethod: order.payment_method
      };
      
      if (approved && refundInfo) {
        activityDetails.refundInfo = refundInfo;
      }
      
      await ActivityLog.create({
        userId: adminId,
        action: activityAction,
        details: activityDetails
      });
    } catch (logError) {
      console.error('Failed to log cancellation approval/rejection activity:', logError);
    }
    
    const updatedOrder = result.rows[0];
    if (refundInfo) {
      updatedOrder.refund_info = refundInfo;
    }
    
    return updatedOrder;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get pending cancellation requests
 * @returns {Promise<Array>} Orders with pending cancellation requests
 */
const getCancellationRequests = async () => {
  const result = await db.query(
    `SELECT o.*, 
            u1.first_name as requester_first_name, 
            u1.last_name as requester_last_name,
            u2.first_name as creator_first_name,
            u2.last_name as creator_last_name
     FROM orders o
     LEFT JOIN users u1 ON u1.id = o.cancellation_requested_by
     LEFT JOIN users u2 ON u2.id = o.created_by
     WHERE o.cancellation_requested_by IS NOT NULL 
       AND o.status = $1
     ORDER BY o.cancellation_requested_at DESC`,
    [ORDER_STATUS.CONFIRMED]
  );
  
  return result.rows;
};

/**
 * Get order status history
 * @param {string} orderId - Order UUID
 * @returns {Promise<Array>} Status history entries
 */
const getOrderStatusHistory = async (orderId) => {
  const result = await db.query(
    `SELECT osh.*, u.first_name, u.last_name
     FROM order_status_history osh
     LEFT JOIN users u ON u.id = osh.changed_by
     WHERE osh.order_id = $1
     ORDER BY osh.created_at DESC`,
    [orderId]
  );
  
  return result.rows;
};

/**
 * Get order statistics
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Order statistics
 */
const getStats = async ({ startDate, endDate } = {}) => {
  const conditions = ["status != 'CANCELLED'"];
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
  
  // Get payment method breakdown instead of status breakdown
  const paymentMethodResult = await db.query(
    `SELECT payment_method, COUNT(*) as count
     FROM orders ${whereClause}
     GROUP BY payment_method`,
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
  const paymentMethodBreakdown = {};
  
  // Initialize all payment methods with 0
  Object.values(PAYMENT_METHODS).forEach(method => {
    paymentMethodBreakdown[method] = 0;
  });
  
  // Fill in actual counts
  paymentMethodResult.rows.forEach(row => {
    paymentMethodBreakdown[row.payment_method] = parseInt(row.count);
  });
  
  return {
    totalOrders: parseInt(stats.total_orders),
    totalRevenue: parseFloat(stats.total_revenue),
    averageOrderValue: parseFloat(stats.average_order_value),
    paymentMethodBreakdown,
    dailyStats: dailyResult.rows.map(row => ({
      date: row.date,
      orders: parseInt(row.orders),
      revenue: parseFloat(row.revenue),
    })),
  };
};

/**
 * Find orders with detailed items (variants, addons, etc.)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Orders with detailed items and pagination info
 */
const findAllWithItems = async ({
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
    `SELECT o.*, u.first_name, u.last_name, l.name as location_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.created_by
     LEFT JOIN locations l ON l.id = o.location_id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );

  // Get detailed items for each order
  const ordersWithItems = [];
  
  for (const order of ordersResult.rows) {
    // Get order items with menu item details
    const itemsQuery = `
      SELECT oi.*, mi.name as item_name, mi.diet_type
      FROM order_items oi
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at
    `;
    
    const itemsResult = await db.query(itemsQuery, [order.id]);
    
    // Process each item to include variants and addons
    const processedItems = [];
    
    for (const item of itemsResult.rows) {
      const processedItem = {
        id: item.id,
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        diet_type: item.diet_type,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
        special_instructions: item.special_instructions,
        variants: [],
        addons: []
      };
      
      try {
        // Get variants if they exist
        if (item.variant_ids && Array.isArray(item.variant_ids) && item.variant_ids.length > 0) {
          const variantsQuery = `
            SELECT name, price FROM item_variants 
            WHERE id = ANY($1::uuid[])
          `;
          const variantsResult = await db.query(variantsQuery, [item.variant_ids]);
          
          processedItem.variants = variantsResult.rows.map(v => ({
            name: v.name,
            price: parseFloat(v.price)
          }));
        }
        
        // Get addons if they exist
        if (item.addon_selections && Array.isArray(item.addon_selections) && item.addon_selections.length > 0) {
          const addonIds = item.addon_selections
            .map(addon => addon.addonId)
            .filter(id => id && id !== null);
          
          if (addonIds.length > 0) {
            const addonsQuery = `
              SELECT name, price FROM addons 
              WHERE id = ANY($1::uuid[])
            `;
            const addonsResult = await db.query(addonsQuery, [addonIds]);
            
            processedItem.addons = addonsResult.rows.map(a => ({
              name: a.name,
              price: parseFloat(a.price)
            }));
          }
        }
      } catch (variantAddonError) {
        // Continue with empty variants/addons if there's an error
      }
      
      processedItems.push(processedItem);
    }
    
    const orderWithItems = {
      ...order,
      total: parseFloat(order.total),
      subtotal: parseFloat(order.subtotal || 0),
      tax: parseFloat(order.tax || 0),
      items: processedItems
    };
    
    ordersWithItems.push(orderWithItems);
  }
  
  return {
    orders: ordersWithItems,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  ORDER_STATUS,
  create,
  findAll,
  findAllWithItems,
  findById,
  updatePaymentStatus,
  requestCancellation,
  approveCancellation,
  getCancellationRequests,
  getOrderStatusHistory,
  getStats,
};