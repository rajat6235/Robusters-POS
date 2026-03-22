/**
 * Dashboard Controller
 * Handles dashboard analytics and statistics.
 */

const Order = require('../models/Order');
const Customer = require('../models/Customer');
const db = require('../database/connection');

/**
 * Get dashboard statistics
 * GET /api/dashboard/stats
 *
 * Single CTE query replaces the previous 9+ separate queries:
 *  - today's order stats (3 queries via Order.getStats)
 *  - yesterday's order stats (3 queries via Order.getStats)
 *  - new customers today (1 query)
 *  - new customers yesterday (1 query)
 *  - recent orders with items (1 query, but GROUP BY ran before LIMIT)
 */
const getDashboardStats = async (req, res) => {
  try {
    const result = await db.query(`
      WITH
        today_orders AS (
          SELECT
            COUNT(*)                                                      AS total_orders,
            COALESCE(SUM(total), 0)                                       AS total_revenue,
            COALESCE(AVG(total), 0)                                       AS avg_order_value,
            COUNT(*) FILTER (WHERE payment_method = 'CASH')               AS cash_count,
            COUNT(*) FILTER (WHERE payment_method = 'CARD')               AS card_count,
            COUNT(*) FILTER (WHERE payment_method = 'UPI')                AS upi_count,
            COUNT(*) FILTER (WHERE payment_method = 'LOYALTY')            AS loyalty_count
          FROM orders
          WHERE DATE(created_at) = CURRENT_DATE
            AND status != 'CANCELLED'
        ),
        yesterday_orders AS (
          SELECT
            COUNT(*)                AS total_orders,
            COALESCE(SUM(total), 0) AS total_revenue
          FROM orders
          WHERE DATE(created_at) = CURRENT_DATE - 1
            AND status != 'CANCELLED'
        ),
        today_customers AS (
          SELECT COUNT(*) AS count
          FROM customers
          WHERE DATE(created_at) = CURRENT_DATE AND is_active = true
        ),
        yesterday_customers AS (
          SELECT COUNT(*) AS count
          FROM customers
          WHERE DATE(created_at) = CURRENT_DATE - 1 AND is_active = true
        ),
        -- Get the 5 most recent order IDs first (cheap index scan),
        -- then join for items — avoids GROUP BY on all today's orders.
        recent_ids AS (
          SELECT id, order_number, customer_name, total, created_at
          FROM orders
          WHERE DATE(created_at) = CURRENT_DATE AND status != 'CANCELLED'
          ORDER BY created_at DESC
          LIMIT 5
        ),
        recent_with_items AS (
          SELECT
            r.id, r.order_number, r.customer_name, r.total, r.created_at,
            STRING_AGG(mi.name, ', ' ORDER BY oi.id) AS items
          FROM recent_ids r
          LEFT JOIN order_items oi ON oi.order_id = r.id
          LEFT JOIN menu_items mi  ON mi.id = oi.menu_item_id
          GROUP BY r.id, r.order_number, r.customer_name, r.total, r.created_at
        )
      SELECT
        row_to_json(t)  AS today,
        row_to_json(y)  AS yesterday,
        tc.count        AS today_customers,
        yc.count        AS yesterday_customers,
        (SELECT json_agg(rw ORDER BY rw.created_at DESC) FROM recent_with_items rw) AS recent_orders
      FROM today_orders t, yesterday_orders y, today_customers tc, yesterday_customers yc
    `);

    const row = result.rows[0];
    const today     = row.today;
    const yesterday = row.yesterday;

    const todayOrders    = parseInt(today.total_orders);
    const todayRevenue   = parseFloat(today.total_revenue);
    const todayAvgOrder  = parseFloat(today.avg_order_value);
    const newCustomers   = parseInt(row.today_customers);

    const yOrders    = parseInt(yesterday.total_orders);
    const yRevenue   = parseFloat(yesterday.total_revenue);
    const yCustomers = parseInt(row.yesterday_customers);

    const pct = (current, prev) =>
      prev > 0 ? ((current - prev) / prev * 100).toFixed(1) : (current > 0 ? 100 : 0);

    const ordersTrend    = pct(todayOrders,  yOrders);
    const revenueTrend   = pct(todayRevenue, yRevenue);
    const customersTrend = pct(newCustomers, yCustomers);

    const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);

    res.json({
      success: true,
      data: {
        todayStats: {
          totalOrders:       todayOrders,
          totalRevenue:      todayRevenue,
          averageOrderValue: todayAvgOrder,
          newCustomers,
        },
        trends: {
          orders:    `${fmt(ordersTrend)}%`,
          revenue:   `${fmt(revenueTrend)}%`,
          customers: `${fmt(customersTrend)}%`,
        },
        recentOrders: (row.recent_orders || []).map(o => ({
          id:           o.order_number,
          items:        o.items || 'No items',
          total:        `₹${parseFloat(o.total).toFixed(0)}`,
          customerName: o.customer_name,
          createdAt:    o.created_at,
        })),
        paymentMethodBreakdown: {
          CASH:    parseInt(today.cash_count),
          CARD:    parseInt(today.card_count),
          UPI:     parseInt(today.upi_count),
          LOYALTY: parseInt(today.loyalty_count),
        },
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message,
    });
  }
};

/**
 * Get weekly analytics
 * GET /api/dashboard/weekly
 */
const getWeeklyAnalytics = async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const weeklyStats = await Order.getStats({
      startDate: startDate.toISOString().split('T')[0],
      endDate:   endDate.toISOString().split('T')[0],
    });

    res.json({ success: true, data: weeklyStats });
  } catch (error) {
    console.error('Weekly analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly analytics',
      error: error.message,
    });
  }
};

/**
 * Get top customers
 * GET /api/dashboard/top-customers
 */
const getTopCustomers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const topCustomers = await Customer.getTopCustomers(parseInt(limit));
    res.json({ success: true, data: topCustomers });
  } catch (error) {
    console.error('Top customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top customers',
      error: error.message,
    });
  }
};

/**
 * Get top customers of the week
 * GET /api/dashboard/top-customers-week
 */
const getTopCustomersOfWeek = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr   = endDate.toISOString().split('T')[0];

    const result = await db.query(
      `SELECT
         c.id, c.first_name, c.last_name, c.phone, c.email,
         COUNT(o.id)            AS weekly_orders,
         COALESCE(SUM(o.total), 0) AS weekly_spent,
         c.total_orders, c.total_spent, c.loyalty_points
       FROM customers c
       INNER JOIN customer_orders co ON c.id = co.customer_id
       INNER JOIN orders o ON co.order_id = o.id
       WHERE DATE(o.created_at) >= $1
         AND DATE(o.created_at) <= $2
         AND c.is_active = true
       GROUP BY c.id, c.first_name, c.last_name, c.phone, c.email,
                c.total_orders, c.total_spent, c.loyalty_points
       ORDER BY weekly_spent DESC, weekly_orders DESC
       LIMIT $3`,
      [startDateStr, endDateStr, parseInt(limit)]
    );

    res.json({
      success: true,
      data: {
        customers: result.rows.map(c => ({
          id:           c.id,
          firstName:    c.first_name,
          lastName:     c.last_name,
          phone:        c.phone,
          email:        c.email,
          weeklyOrders: parseInt(c.weekly_orders),
          weeklySpent:  parseFloat(c.weekly_spent),
          totalOrders:  parseInt(c.total_orders),
          totalSpent:   parseFloat(c.total_spent),
          loyaltyPoints: parseInt(c.loyalty_points),
        })),
        dateRange: { startDate: startDateStr, endDate: endDateStr },
      },
    });
  } catch (error) {
    console.error('Top customers of week error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top customers of the week',
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getWeeklyAnalytics,
  getTopCustomers,
  getTopCustomersOfWeek,
};
