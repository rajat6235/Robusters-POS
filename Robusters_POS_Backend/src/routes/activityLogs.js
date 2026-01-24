/**
 * Activity Log Routes
 * Defines activity log API endpoints.
 */

const express = require('express');
const router = express.Router();

const activityLogController = require('../controllers/activityLogController');
const { authenticate, adminOnly } = require('../middleware/auth');

/**
 * @route   GET /api/activity-logs
 * @desc    Get all activity logs with optional filters
 * @access  Private (Admin)
 */
router.get('/', authenticate, adminOnly, activityLogController.getActivityLogs);

/**
 * @route   GET /api/activity-logs/actions
 * @desc    Get available action types
 * @access  Private (Admin)
 */
router.get('/actions', authenticate, adminOnly, activityLogController.getActionTypes);

module.exports = router;
