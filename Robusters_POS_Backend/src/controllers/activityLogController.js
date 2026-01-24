/**
 * Activity Log Controller
 * Handles activity log retrieval operations.
 */

const ActivityLog = require('../models/ActivityLog');

/**
 * Get all activity logs (Admin only)
 * GET /api/activity-logs
 */
const getActivityLogs = async (req, res, next) => {
  try {
    const {
      limit = 50,
      offset = 0,
      userId,
      action,
      startDate,
      endDate,
    } = req.query;

    const result = await ActivityLog.findAll({
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      userId: userId || null,
      action: action || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    });

    res.json({
      success: true,
      data: {
        logs: result.logs.map((log) => ({
          id: log.id,
          userId: log.user_id,
          userEmail: log.user_email,
          userName: log.user_first_name && log.user_last_name
            ? `${log.user_first_name} ${log.user_last_name}`
            : null,
          action: log.action,
          details: log.details,
          ipAddress: log.ip_address,
          userAgent: log.user_agent,
          createdAt: log.created_at,
        })),
        pagination: {
          total: result.total,
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available action types
 * GET /api/activity-logs/actions
 */
const getActionTypes = async (req, res) => {
  res.json({
    success: true,
    data: {
      actions: Object.values(ActivityLog.ACTIONS),
    },
  });
};

module.exports = {
  getActivityLogs,
  getActionTypes,
};
