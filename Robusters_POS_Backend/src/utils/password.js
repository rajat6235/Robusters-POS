/**
 * Password Utilities
 * Handles password hashing and verification using bcrypt.
 * bcrypt is preferred over alternatives because:
 * - Includes salt automatically
 * - Adaptive cost factor (saltRounds) for future-proofing
 * - Well-audited and battle-tested
 */

const bcrypt = require('bcrypt');
const config = require('../config');

/**
 * Hash a plain text password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, config.bcrypt.saltRounds);
};

/**
 * Compare plain text password with hash
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Stored password hash
 * @returns {Promise<boolean>} True if password matches
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
