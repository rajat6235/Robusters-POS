/**
 * Order Routes
 * All order-related API endpoints.
 */

const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const { authenticate, managerOrAdmin, adminOnly } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');
const { idempotent } = require('../middleware/idempotency');
const {
  validate,
  uuidParam,
  createOrderRules,
  previewMealPackageRules,
  updatePaymentStatusRules,
  cancelRequestRules,
  cancelApprovalRules,
} = require('../validators/orders');

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Private (Manager/Admin)
 */
router.post(
  '/',
  authenticate,
  managerOrAdmin,
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'orders-create' }),
  idempotent('orders:create'),
  createOrderRules,
  validate,
  orderController.createOrder
);

/**
 * @route   POST /api/orders/meal-package-preview
 * @desc    Preview meal-package coverage for a cart before checkout
 * @access  Private (Manager/Admin)
 */
router.post(
  '/meal-package-preview',
  authenticate,
  managerOrAdmin,
  rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'order-mp-preview' }),
  previewMealPackageRules,
  validate,
  orderController.previewMealPackageCoverage
);

/**
 * @route   GET /api/orders
 * @desc    Get all orders with pagination and filters
 * @access  Private (Manager/Admin)
 */
router.get(
  '/',
  authenticate,
  managerOrAdmin,
  orderController.getOrders
);

/**
 * @route   GET /api/orders/cancellation-requests
 * @desc    Get pending cancellation requests
 * @access  Private (Admin only)
 */
router.get(
  '/cancellation-requests',
  authenticate,
  adminOnly,
  orderController.getCancellationRequests
);

/**
 * @route   GET /api/orders/stats
 * @desc    Get order statistics
 * @access  Private (Manager/Admin)
 */
router.get(
  '/stats',
  authenticate,
  managerOrAdmin,
  orderController.getOrderStats
);

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by ID
 * @access  Private (Manager/Admin)
 */
router.get(
  '/:id',
  authenticate,
  managerOrAdmin,
  [uuidParam('id'), validate],
  orderController.getOrder
);

/**
 * @route   PATCH /api/orders/:id/payment
 * @desc    Update payment status
 * @access  Private (Manager/Admin)
 */
router.patch(
  '/:id/payment',
  authenticate,
  managerOrAdmin,
  [uuidParam('id'), ...updatePaymentStatusRules, validate],
  orderController.updatePaymentStatus
);

/**
 * @route   POST /api/orders/:id/cancel-request
 * @desc    Request order cancellation
 * @access  Private (Manager/Admin)
 */
router.post(
  '/:id/cancel-request',
  authenticate,
  managerOrAdmin,
  [uuidParam('id'), ...cancelRequestRules, validate],
  orderController.requestCancellation
);

/**
 * @route   POST /api/orders/:id/cancel-approve
 * @desc    Approve or reject order cancellation
 * @access  Private (Admin only)
 */
router.post(
  '/:id/cancel-approve',
  authenticate,
  adminOnly,
  [uuidParam('id'), ...cancelApprovalRules, validate],
  orderController.approveCancellation
);

/**
 * @route   GET /api/orders/:id/status-history
 * @desc    Get order status history
 * @access  Private (Manager/Admin)
 */
router.get(
  '/:id/status-history',
  authenticate,
  managerOrAdmin,
  [uuidParam('id'), validate],
  orderController.getOrderStatusHistory
);

module.exports = router;