/**
 * Package Activity Logger
 * Comprehensive audit trail for all package operations
 */

const db = require('../database/connection');

/**
 * Log activity for package operations
 * @param {Object} params - Activity log parameters
 * @param {string} params.entityType - Type of entity (package, assignment, consumption)
 * @param {string} params.entityId - UUID of the entity
 * @param {string} params.action - Action performed
 * @param {string} params.performedBy - User ID who performed the action
 * @param {Object} params.changes - Before/after state
 * @param {Object} params.metadata - Additional context
 * @param {string} params.customerId - Related customer ID
 * @param {string} params.packageId - Related package ID
 * @param {string} params.ipAddress - IP address
 * @param {string} params.userAgent - User agent string
 * @returns {Promise<Object>} Created log entry
 */
const logPackageActivity = async ({
  entityType,
  entityId,
  action,
  performedBy,
  changes = null,
  metadata = null,
  customerId = null,
  packageId = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    const result = await db.query(
      `INSERT INTO package_activity_log (
        entity_type, entity_id, action, performed_by,
        changes, metadata, customer_id, package_id,
        ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        entityType,
        entityId,
        action,
        performedBy,
        changes ? JSON.stringify(changes) : null,
        metadata ? JSON.stringify(metadata) : null,
        customerId,
        packageId,
        ipAddress,
        userAgent,
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Failed to log package activity:', error);
    // Don't throw - logging failures shouldn't break main operations
    return null;
  }
};

/**
 * Get activity log for an entity
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Activity log entries
 */
const getActivityLog = async (entityType, entityId, { limit = 50, offset = 0 } = {}) => {
  const result = await db.query(
    `SELECT
      pal.*,
      u.first_name || ' ' || u.last_name as performed_by_name,
      u.email as performed_by_email
    FROM package_activity_log pal
    LEFT JOIN users u ON u.id = pal.performed_by
    WHERE pal.entity_type = $1 AND pal.entity_id = $2
    ORDER BY pal.performed_at DESC
    LIMIT $3 OFFSET $4`,
    [entityType, entityId, limit, offset]
  );

  return result.rows;
};

/**
 * Get activity log for a customer
 * @param {string} customerId - Customer ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Activity log entries
 */
const getCustomerActivityLog = async (customerId, { limit = 50, offset = 0 } = {}) => {
  const result = await db.query(
    `SELECT
      pal.*,
      u.first_name || ' ' || u.last_name as performed_by_name,
      mp.name as package_name
    FROM package_activity_log pal
    LEFT JOIN users u ON u.id = pal.performed_by
    LEFT JOIN meal_packages mp ON mp.id = pal.package_id
    WHERE pal.customer_id = $1
    ORDER BY pal.performed_at DESC
    LIMIT $2 OFFSET $3`,
    [customerId, limit, offset]
  );

  return result.rows;
};

/**
 * Get all activity for a specific action type
 * @param {string} action - Action type
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Activity log entries
 */
const getActivityByAction = async (action, { limit = 100, offset = 0 } = {}) => {
  const result = await db.query(
    `SELECT
      pal.*,
      u.first_name || ' ' || u.last_name as performed_by_name,
      c.first_name || ' ' || c.last_name as customer_name,
      mp.name as package_name
    FROM package_activity_log pal
    LEFT JOIN users u ON u.id = pal.performed_by
    LEFT JOIN customers c ON c.id = pal.customer_id
    LEFT JOIN meal_packages mp ON mp.id = pal.package_id
    WHERE pal.action = $1
    ORDER BY pal.performed_at DESC
    LIMIT $2 OFFSET $3`,
    [action, limit, offset]
  );

  return result.rows;
};

/**
 * Helper: Create changes object for logging
 * @param {Object} before - State before change
 * @param {Object} after - State after change
 * @returns {Object} Changes object
 */
const createChangesObject = (before, after) => {
  return {
    before: before || null,
    after: after || null,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Helper: Extract request metadata
 * @param {Object} req - Express request object
 * @returns {Object} Metadata object
 */
const extractRequestMetadata = (req) => {
  return {
    method: req.method,
    path: req.path,
    query: req.query,
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  logPackageActivity,
  getActivityLog,
  getCustomerActivityLog,
  getActivityByAction,
  createChangesObject,
  extractRequestMetadata,
};
