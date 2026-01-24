/**
 * Authentication Routes
 * Defines all auth-related API endpoints.
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { loginRules, registerRules, updateUserRules, validate } = require('../validators/auth');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', loginRules, validate, authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and log activity
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Admin only)
 * @access  Private (Admin)
 */
router.post('/register', authenticate, adminOnly, registerRules, validate, authController.register);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getProfile);

/**
 * @route   GET /api/auth/users
 * @desc    Get all users
 * @access  Private (Admin)
 */
router.get('/users', authenticate, adminOnly, authController.getAllUsers);

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Update a user
 * @access  Private (Admin)
 */
router.put('/users/:id', authenticate, adminOnly, updateUserRules, validate, authController.updateUser);

/**
 * @route   PATCH /api/auth/users/:id/deactivate
 * @desc    Deactivate a user account
 * @access  Private (Admin)
 */
router.patch('/users/:id/deactivate', authenticate, adminOnly, authController.deactivateUser);

/**
 * @route   PATCH /api/auth/users/:id/activate
 * @desc    Activate a user account
 * @access  Private (Admin)
 */
router.patch('/users/:id/activate', authenticate, adminOnly, authController.activateUser);

module.exports = router;
