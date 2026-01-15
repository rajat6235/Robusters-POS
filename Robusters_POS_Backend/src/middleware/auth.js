/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request.
 */

const { verifyToken, extractToken } = require('../utils/jwt');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const User = require('../models/User');

/**
 * Authenticate request using JWT token
 * Extracts token from Authorization header, verifies it,
 * and attaches user info to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token and get payload
    const payload = verifyToken(token);

    // Optionally verify user still exists and is active
    const user = await User.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.is_active) {
      throw new ForbiddenError('User account is deactivated');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Factory function to create role-based authorization middleware
 * @param {...string} allowedRoles - Roles that are allowed access
 * @returns {Function} Express middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`));
    }

    next();
  };
};

/**
 * Middleware that allows only ADMIN users
 */
const adminOnly = authorize(User.ROLES.ADMIN);

/**
 * Middleware that allows ADMIN and MANAGER users
 */
const managerOrAdmin = authorize(User.ROLES.ADMIN, User.ROLES.MANAGER);

module.exports = {
  authenticate,
  authorize,
  adminOnly,
  managerOrAdmin,
};
