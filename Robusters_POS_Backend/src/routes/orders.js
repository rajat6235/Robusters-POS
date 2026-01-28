/**
 * Order Routes
 * All order-related API endpoints.
 */

const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const { authenticate, managerOrAdmin } = require('../middleware/auth');
const {
  validate,
  uuidParam,
  createOrderRules,
  updatePaymentStatusRules,
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
  createOrderRules,
  validate,
  orderController.createOrder
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

module.exports = router;