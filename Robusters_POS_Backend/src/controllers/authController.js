/**
 * Authentication Controller
 * Handles login, registration, and user profile operations.
 */

const User = require('../models/User');
const { comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { UnauthorizedError, ConflictError, NotFoundError } = require('../utils/errors');

/**
 * Login user and return JWT token
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedError('Account is deactivated. Contact administrator.');
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register a new user (Admin only)
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: role || User.ROLES.MANAGER,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
      },
      message: 'User created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          lastLogin: user.last_login,
          createdAt: user.created_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (Admin only)
 * GET /api/auth/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const users = await User.findAll({
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      success: true,
      data: {
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isActive: user.is_active,
          lastLogin: user.last_login,
          createdAt: user.created_at,
        })),
        count: users.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate a user (Admin only)
 * PATCH /api/auth/users/:id/deactivate
 */
const deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent self-deactivation
    if (id === req.user.id) {
      throw new ConflictError('Cannot deactivate your own account');
    }

    const user = await User.updateActiveStatus(id, false);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reactivate a user (Admin only)
 * PATCH /api/auth/users/:id/activate
 */
const activateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.updateActiveStatus(id, true);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      message: 'User activated successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  getProfile,
  getAllUsers,
  deactivateUser,
  activateUser,
};
