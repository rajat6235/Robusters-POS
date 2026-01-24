/**
 * User Model
 * Handles all database operations for users.
 * Uses parameterized queries to prevent SQL injection.
 */

const db = require('../database/connection');
const { hashPassword } = require('../utils/password');

// Valid roles enum
const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
};

/**
 * Find a user by their email address
 * @param {string} email - User's email
 * @returns {Promise<Object|null>} User object or null
 */
const findByEmail = async (email) => {
  const result = await db.query(
    `SELECT id, email, password_hash, first_name, last_name, role, is_active, last_login, created_at
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  return result.rows[0] || null;
};

/**
 * Find a user by their ID
 * @param {string} id - User's UUID
 * @returns {Promise<Object|null>} User object or null (without password_hash)
 */
const findById = async (id) => {
  const result = await db.query(
    `SELECT id, email, first_name, last_name, role, is_active, last_login, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.email - Email address
 * @param {string} userData.password - Plain text password (will be hashed)
 * @param {string} userData.firstName - First name
 * @param {string} userData.lastName - Last name
 * @param {string} userData.role - User role (ADMIN or MANAGER)
 * @returns {Promise<Object>} Created user (without password_hash)
 */
const create = async ({ email, password, firstName, lastName, role = ROLES.MANAGER }) => {
  const passwordHash = await hashPassword(password);

  const result = await db.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, first_name, last_name, role, is_active, created_at`,
    [email.toLowerCase(), passwordHash, firstName, lastName, role]
  );

  return result.rows[0];
};

/**
 * Update user's last login timestamp
 * @param {string} id - User's UUID
 * @returns {Promise<void>}
 */
const updateLastLogin = async (id) => {
  await db.query(
    `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
    [id]
  );
};

/**
 * Get all users (for admin)
 * @param {Object} options - Query options
 * @param {number} options.limit - Max results
 * @param {number} options.offset - Skip results
 * @returns {Promise<Array>} Array of users
 */
const findAll = async ({ limit = 50, offset = 0 } = {}) => {
  const result = await db.query(
    `SELECT id, email, first_name, last_name, role, is_active, last_login, created_at
     FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
};

/**
 * Update user's active status
 * @param {string} id - User's UUID
 * @param {boolean} isActive - New status
 * @returns {Promise<Object|null>} Updated user or null
 */
const updateActiveStatus = async (id, isActive) => {
  const result = await db.query(
    `UPDATE users SET is_active = $1 WHERE id = $2
     RETURNING id, email, first_name, last_name, role, is_active`,
    [isActive, id]
  );
  return result.rows[0] || null;
};

/**
 * Update user details
 * @param {string} id - User's UUID
 * @param {Object} userData - Data to update
 * @param {string} userData.firstName - First name
 * @param {string} userData.lastName - Last name
 * @param {string} userData.email - Email
 * @param {string} userData.role - Role
 * @param {string} userData.password - New password (optional)
 * @returns {Promise<Object|null>} Updated user or null
 */
const update = async (id, { firstName, lastName, email, role, password }) => {
  // Build dynamic update query
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (firstName !== undefined) {
    updates.push(`first_name = $${paramIndex}`);
    values.push(firstName);
    paramIndex++;
  }

  if (lastName !== undefined) {
    updates.push(`last_name = $${paramIndex}`);
    values.push(lastName);
    paramIndex++;
  }

  if (email !== undefined) {
    updates.push(`email = $${paramIndex}`);
    values.push(email.toLowerCase());
    paramIndex++;
  }

  if (role !== undefined) {
    updates.push(`role = $${paramIndex}`);
    values.push(role);
    paramIndex++;
  }

  if (password) {
    const passwordHash = await hashPassword(password);
    updates.push(`password_hash = $${paramIndex}`);
    values.push(passwordHash);
    paramIndex++;
  }

  if (updates.length === 0) {
    return findById(id);
  }

  values.push(id);

  const result = await db.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, email, first_name, last_name, role, is_active, created_at`,
    values
  );

  return result.rows[0] || null;
};

/**
 * Check if any user exists (for initial setup)
 * @returns {Promise<boolean>} True if at least one user exists
 */
const hasAnyUser = async () => {
  const result = await db.query('SELECT 1 FROM users LIMIT 1');
  return result.rows.length > 0;
};

module.exports = {
  ROLES,
  findByEmail,
  findById,
  create,
  update,
  updateLastLogin,
  findAll,
  updateActiveStatus,
  hasAnyUser,
};
