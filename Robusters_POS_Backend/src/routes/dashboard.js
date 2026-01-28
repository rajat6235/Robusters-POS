/**
 * Dashboard Routes
 * Handles dashboard analytics endpoints.
 */

const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getWeeklyAnalytics,
  getTopCustomers,
  getTopCustomersOfWeek
} = require('../controllers/dashboardController');

const { authenticate } = require('../middleware/auth');

// All dashboard routes require authentication
router.use(authenticate);

/**
 * @route GET /api/dashboard/stats
 * @desc Get dashboard statistics (today's data with trends)
 * @access Private
 */
router.get('/stats', getDashboardStats);

/**
 * @route GET /api/dashboard/weekly
 * @desc Get weekly analytics
 * @access Private
 */
router.get('/weekly', getWeeklyAnalytics);

/**
 * @route GET /api/dashboard/top-customers
 * @desc Get top customers by spending
 * @access Private
 */
router.get('/top-customers', getTopCustomers);

/**
 * @route GET /api/dashboard/top-customers-week
 * @desc Get top 5 customers of the week
 * @access Private
 */
router.get('/top-customers-week', getTopCustomersOfWeek);

module.exports = router;