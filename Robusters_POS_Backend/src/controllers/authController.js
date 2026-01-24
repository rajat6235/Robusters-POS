/**
 * Authentication Controller
 * Handles login, registration, and user profile operations.
 */

const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { UnauthorizedError, ConflictError, NotFoundError } = require('../utils/errors');

/**
 * Helper to get client info for activity logging
 */
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress || null,
  userAgent: req.get('User-Agent') || null,
});

/**
 * Login user and return JWT token
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const clientInfo = getClientInfo(req);

    // Find user by email
    const user = await User.findByEmail(email);

    if (!user) {
      // Log failed login attempt
      await ActivityLog.create({
        userId: null,
        action: ActivityLog.ACTIONS.LOGIN_FAILED,
        details: { email, reason: 'User not found' },
        ...clientInfo,
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      await ActivityLog.create({
        userId: user.id,
        action: ActivityLog.ACTIONS.LOGIN_FAILED,
        details: { reason: 'Account deactivated' },
        ...clientInfo,
      });
      throw new UnauthorizedError('Account is deactivated. Contact administrator.');
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      await ActivityLog.create({
        userId: user.id,
        action: ActivityLog.ACTIONS.LOGIN_FAILED,
        details: { reason: 'Invalid password' },
        ...clientInfo,
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Log successful login
    await ActivityLog.create({
      userId: user.id,
      action: ActivityLog.ACTIONS.LOGIN,
      details: { email: user.email },
      ...clientInfo,
    });

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
 * Logout user
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const clientInfo = getClientInfo(req);

    // Log logout
    await ActivityLog.create({
      userId: req.user.id,
      action: ActivityLog.ACTIONS.LOGOUT,
      details: { email: req.user.email },
      ...clientInfo,
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
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
    const clientInfo = getClientInfo(req);

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

    // Log user creation
    await ActivityLog.create({
      userId: req.user.id,
      action: ActivityLog.ACTIONS.USER_CREATED,
      details: {
        createdUserId: user.id,
        createdUserEmail: user.email,
        createdUserRole: user.role,
      },
      ...clientInfo,
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
 * Update a user (Admin only)
 * PUT /api/auth/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role, password } = req.body;
    const clientInfo = getClientInfo(req);

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // If email is being changed, check for conflicts
    if (email && email.toLowerCase() !== existingUser.email) {
      const emailUser = await User.findByEmail(email);
      if (emailUser) {
        throw new ConflictError('User with this email already exists');
      }
    }

    // Prevent changing own role
    if (id === req.user.id && role && role !== existingUser.role) {
      throw new ConflictError('Cannot change your own role');
    }

    const user = await User.update(id, { email, firstName, lastName, role, password });

    // Log user update
    await ActivityLog.create({
      userId: req.user.id,
      action: ActivityLog.ACTIONS.USER_UPDATED,
      details: {
        updatedUserId: user.id,
        updatedUserEmail: user.email,
        changes: {
          ...(email && { email }),
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(role && { role }),
          ...(password && { passwordChanged: true }),
        },
      },
      ...clientInfo,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isActive: user.is_active,
          createdAt: user.created_at,
        },
      },
      message: 'User updated successfully',
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
    const clientInfo = getClientInfo(req);

    // Prevent self-deactivation
    if (id === req.user.id) {
      throw new ConflictError('Cannot deactivate your own account');
    }

    const user = await User.updateActiveStatus(id, false);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Log user deactivation
    await ActivityLog.create({
      userId: req.user.id,
      action: ActivityLog.ACTIONS.USER_DEACTIVATED,
      details: {
        deactivatedUserId: user.id,
        deactivatedUserEmail: user.email,
      },
      ...clientInfo,
    });

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
    const clientInfo = getClientInfo(req);

    const user = await User.updateActiveStatus(id, true);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Log user activation
    await ActivityLog.create({
      userId: req.user.id,
      action: ActivityLog.ACTIONS.USER_ACTIVATED,
      details: {
        activatedUserId: user.id,
        activatedUserEmail: user.email,
      },
      ...clientInfo,
    });

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
  logout,
  register,
  getProfile,
  getAllUsers,
  updateUser,
  deactivateUser,
  activateUser,
};
