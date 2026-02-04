/**
 * Dashboard Controller
 * Handles dashboard analytics and statistics.
 */

const Order = require('../models/Order');
const Customer = require('../models/Customer');
const db = require('../database/connection');

/**
 * Get dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's order stats
    const todayStats = await Order.getStats({
      startDate: today,
      endDate: today
    });
    
    // Get new customers today
    const newCustomersResult = await db.query(
      `SELECT COUNT(*) as count FROM customers 
       WHERE DATE(created_at) = CURRENT_DATE AND is_active = true`
    );
    const newCustomersToday = parseInt(newCustomersResult.rows[0].count);
    
    // Get recent orders (last 5)
    const recentOrdersResult = await db.query(
      `SELECT o.id, o.order_number, o.customer_name, o.total, o.created_at,
              STRING_AGG(mi.name, ', ') as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE DATE(o.created_at) = CURRENT_DATE AND o.status != 'CANCELLED'
       GROUP BY o.id, o.order_number, o.customer_name, o.total, o.created_at
       ORDER BY o.created_at DESC
       LIMIT 5`
    );
    
    // Calculate trends (compare today vs yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const yesterdayStats = await Order.getStats({
      startDate: yesterdayStr,
      endDate: yesterdayStr
    });
    
    // Calculate percentage changes
    const ordersTrend = yesterdayStats.totalOrders > 0 
      ? ((todayStats.totalOrders - yesterdayStats.totalOrders) / yesterdayStats.totalOrders * 100).toFixed(1)
      : todayStats.totalOrders > 0 ? 100 : 0;
    
    const revenueTrend = yesterdayStats.totalRevenue > 0
      ? ((todayStats.totalRevenue - yesterdayStats.totalRevenue) / yesterdayStats.totalRevenue * 100).toFixed(1)
      : todayStats.totalRevenue > 0 ? 100 : 0;
    
    // Get yesterday's new customers for trend
    const yesterdayCustomersResult = await db.query(
      `SELECT COUNT(*) as count FROM customers 
       WHERE DATE(created_at) = $1 AND is_active = true`,
      [yesterdayStr]
    );
    const yesterdayNewCustomers = parseInt(yesterdayCustomersResult.rows[0].count);
    
    const customersTrend = yesterdayNewCustomers > 0
      ? ((newCustomersToday - yesterdayNewCustomers) / yesterdayNewCustomers * 100).toFixed(1)
      : newCustomersToday > 0 ? 100 : 0;

    res.json({
      success: true,
      data: {
        todayStats: {
          totalOrders: todayStats.totalOrders,
          totalRevenue: todayStats.totalRevenue,
          averageOrderValue: todayStats.averageOrderValue,
          newCustomers: newCustomersToday
        },
        trends: {
          orders: `${ordersTrend >= 0 ? '+' : ''}${ordersTrend}%`,
          revenue: `${revenueTrend >= 0 ? '+' : ''}${revenueTrend}%`,
          customers: `${customersTrend >= 0 ? '+' : ''}${customersTrend}%`
        },
        recentOrders: recentOrdersResult.rows.map(order => ({
          id: order.order_number,
          items: order.items || 'No items',
          total: `₹${parseFloat(order.total).toFixed(0)}`,
          customerName: order.customer_name,
          createdAt: order.created_at
        })),
        paymentMethodBreakdown: todayStats.paymentMethodBreakdown
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get weekly analytics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getWeeklyAnalytics = async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const weeklyStats = await Order.getStats({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
    
    res.json({
      success: true,
      data: weeklyStats
    });
  } catch (error) {
    console.error('Weekly analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly analytics',
      error: error.message
    });
  }
};

/**
 * Get top customers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTopCustomers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const topCustomers = await Customer.getTopCustomers(parseInt(limit));
    
    res.json({
      success: true,
      data: topCustomers
    });
  } catch (error) {
    console.error('Top customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top customers',
      error: error.message
    });
  }
};

/**
 * Get top customers of the week
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTopCustomersOfWeek = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // Calculate date range for this week
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Get top customers based on orders this week
    const topCustomersQuery = `
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        COUNT(o.id) as weekly_orders,
        COALESCE(SUM(o.total), 0) as weekly_spent,
        c.total_orders,
        c.total_spent,
        c.loyalty_points
      FROM customers c
      INNER JOIN customer_orders co ON c.id = co.customer_id
      INNER JOIN orders o ON co.order_id = o.id
      WHERE DATE(o.created_at) >= $1 AND DATE(o.created_at) <= $2
        AND c.is_active = true
      GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email, c.total_orders, c.total_spent, c.loyalty_points
      ORDER BY weekly_spent DESC, weekly_orders DESC
      LIMIT $3
    `;
    
    const result = await db.query(topCustomersQuery, [startDateStr, endDateStr, parseInt(limit)]);
    
    const topCustomers = result.rows.map(customer => ({
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone,
      email: customer.email,
      weeklyOrders: parseInt(customer.weekly_orders),
      weeklySpent: parseFloat(customer.weekly_spent),
      totalOrders: parseInt(customer.total_orders),
      totalSpent: parseFloat(customer.total_spent),
      loyaltyPoints: parseInt(customer.loyalty_points)
    }));
    
    res.json({
      success: true,
      data: {
        customers: topCustomers,
        dateRange: {
          startDate: startDateStr,
          endDate: endDateStr
        }
      }
    });
  } catch (error) {
    console.error('Top customers of week error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top customers of the week',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getWeeklyAnalytics,
  getTopCustomers,
  getTopCustomersOfWeek
};