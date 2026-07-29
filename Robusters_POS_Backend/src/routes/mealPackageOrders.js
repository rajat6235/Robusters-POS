/**
 * Meal Package Order Routes
 * OTP-verified meal package order flow
 */

const express = require('express');
const router = express.Router();

const mealPackageOrderController = require('../controllers/mealPackageOrderController');
const { authenticate, managerOrAdmin } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');
const { idempotent } = require('../middleware/idempotency');
const {
  validate,
  lookupCustomerRules,
  getAllowedItemsRules,
  requestOTPRules,
  verifyOTPAndCreateOrderRules,
  getDashboardRules,
  getConsumptionHistoryRules,
} = require('../validators/mealPackageOrders');

/**
 * @route   POST /api/meal-package-orders/lookup
 * @desc    Lookup customer by phone and check meal package status
 * @access  Private (Manager/Admin)
 */
router.post(
  '/lookup',
  authenticate,
  managerOrAdmin,
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'mp-lookup' }),
  lookupCustomerRules,
  validate,
  mealPackageOrderController.lookupCustomer
);

/**
 * @route   GET /api/meal-package-orders/allowed-items/:customerPackageId
 * @desc    Get allowed menu items for customer's package
 * @access  Private (Manager/Admin)
 */
router.get(
  '/allowed-items/:customerPackageId',
  authenticate,
  managerOrAdmin,
  getAllowedItemsRules,
  validate,
  mealPackageOrderController.getAllowedMenuItems
);

/**
 * @route   POST /api/meal-package-orders/request-otp
 * @desc    Request OTP for meal package order
 * @access  Private (Manager/Admin)
 */
router.post(
  '/request-otp',
  authenticate,
  managerOrAdmin,
  rateLimit({ windowMs: 60_000, max: 5, keyPrefix: 'mp-otp-request' }),
  requestOTPRules,
  validate,
  mealPackageOrderController.requestOrderOTP
);

/**
 * @route   POST /api/meal-package-orders/verify-and-create
 * @desc    Verify OTP and create meal package order
 * @access  Private (Manager/Admin)
 */
router.post(
  '/verify-and-create',
  authenticate,
  managerOrAdmin,
  rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'mp-otp-verify' }),
  idempotent('meal-package-orders:verify-and-create'),
  verifyOTPAndCreateOrderRules,
  validate,
  mealPackageOrderController.verifyOTPAndCreateOrder
);

/**
 * @route   GET /api/meal-package-orders/orders
 * @desc    Get all meal package orders (consumption records) with pagination
 * @access  Private (Manager/Admin)
 */
router.get(
  '/orders',
  authenticate,
  managerOrAdmin,
  mealPackageOrderController.getAllOrders
);

/**
 * @route   GET /api/meal-package-orders/dashboard
 * @desc    Get meal package dashboard data
 * @access  Private (Manager/Admin)
 */
router.get(
  '/dashboard',
  authenticate,
  managerOrAdmin,
  getDashboardRules,
  validate,
  mealPackageOrderController.getDashboard
);

/**
 * @route   GET /api/meal-package-orders/consumption-history/:customerPackageId
 * @desc    Get detailed consumption history for a package
 * @access  Private (Manager/Admin)
 */
router.get(
  '/consumption-history/:customerPackageId',
  authenticate,
  managerOrAdmin,
  getConsumptionHistoryRules,
  validate,
  mealPackageOrderController.getConsumptionHistory
);

module.exports = router;
