/**
 * ActivityLog Model
 * Handles all database operations for activity logs.
 */

const db = require('../database/connection');

// Action types enum
const ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  ORDER_CANCELLATION_REQUESTED: 'ORDER_CANCELLATION_REQUESTED',
  ORDER_CANCELLATION_APPROVED: 'ORDER_CANCELLATION_APPROVED',
  ORDER_CANCELLATION_REJECTED: 'ORDER_CANCELLATION_REJECTED',
};

/**
 * Create a new activity log entry
 * @param {Object} logData - Log data
 * @param {string} logData.userId - User ID (can be null for failed logins)
 * @param {string} logData.action - Action type
 * @param {Object} logData.details - Additional details
 * @param {string} logData.ipAddress - Client IP address
 * @param {string} logData.userAgent - Client user agent
 * @returns {Promise<Object>} Created log entry
 */
const create = async ({ userId, action, details = {}, ipAddress = null, userAgent = null }) => {
  const result = await db.query(
    `INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, action, details, ip_address, user_agent, created_at`,
    [userId, action, JSON.stringify(details), ipAddress, userAgent]
  );
  return result.rows[0];
};

/**
 * Get activity logs with pagination and filtering
 * @param {Object} options - Query options
 * @param {number} options.limit - Max results
 * @param {number} options.offset - Skip results
 * @param {string} options.userId - Filter by user ID
 * @param {string} options.action - Filter by action type
 * @param {Date} options.startDate - Filter by start date
 * @param {Date} options.endDate - Filter by end date
 * @returns {Promise<Object>} Logs and total count
 */
const findAll = async ({ limit = 50, offset = 0, userId = null, action = null, startDate = null, endDate = null } = {}) => {
  let query = `
    SELECT
      al.id,
      al.user_id,
      al.action,
      al.details,
      al.ip_address,
      al.user_agent,
      al.created_at,
      u.email as user_email,
      u.first_name as user_first_name,
      u.last_name as user_last_name
    FROM activity_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;

  let countQuery = `SELECT COUNT(*) FROM activity_logs al WHERE 1=1`;
  const params = [];
  const countParams = [];
  let paramIndex = 1;

  if (userId) {
    query += ` AND al.user_id = $${paramIndex}`;
    countQuery += ` AND al.user_id = $${paramIndex}`;
    params.push(userId);
    countParams.push(userId);
    paramIndex++;
  }

  if (action) {
    query += ` AND al.action = $${paramIndex}`;
    countQuery += ` AND al.action = $${paramIndex}`;
    params.push(action);
    countParams.push(action);
    paramIndex++;
  }

  if (startDate) {
    query += ` AND al.created_at >= $${paramIndex}`;
    countQuery += ` AND al.created_at >= $${paramIndex}`;
    params.push(startDate);
    countParams.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND al.created_at <= $${paramIndex}`;
    countQuery += ` AND al.created_at <= $${paramIndex}`;
    params.push(endDate);
    countParams.push(endDate);
    paramIndex++;
  }

  query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const [logsResult, countResult] = await Promise.all([
    db.query(query, params),
    db.query(countQuery, countParams),
  ]);

  return {
    logs: logsResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
};

/**
 * Get activity logs for a specific user
 * @param {string} userId - User ID
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Array of logs
 */
const findByUserId = async (userId, limit = 20) => {
  const result = await db.query(
    `SELECT id, action, details, ip_address, created_at
     FROM activity_logs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
};

module.exports = {
  ACTIONS,
  create,
  findAll,
  findByUserId,
};
