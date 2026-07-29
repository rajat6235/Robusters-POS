/**
 * Meal Package Routes
 * All meal package and assignment API endpoints.
 */

const express = require('express');
const router = express.Router();

const mealPackageController = require('../controllers/mealPackageController');
const packageAssignmentController = require('../controllers/packageAssignmentController');
const { authenticate, adminOnly, managerOrAdmin } = require('../middleware/auth');
const { idempotent } = require('../middleware/idempotency');
const {
  validate,
  // Package validators
  createPackageRules,
  updatePackageRules,
  getPackageByIdRules,
  getAllPackagesRules,
  addAllowedItemRules,
  removeAllowedItemRules,
  bulkAddItemsRules,
  // Assignment validators
  assignPackageRules,
  updateAssignmentRules,
  cancelAssignmentRules,
  completeAssignmentRules,
  recordConsumptionRules,
  getCustomerPackagesRules,
  getAssignmentByIdRules,
  getConsumptionHistoryRules,
  getAllActivePackagesRules,
  getExpiringPackagesRules,
  bulkAssignPackagesRules,
} = require('../validators/mealPackages');

// =============================================
// MEAL PACKAGE ROUTES
// =============================================

/**
 * @route   POST /api/admin/meal-packages
 * @desc    Create new meal package
 * @access  Private (Admin)
 */
router.post(
  '/meal-packages',
  authenticate,
  adminOnly,
  createPackageRules,
  validate,
  mealPackageController.createPackage
);

/**
 * @route   GET /api/admin/meal-packages
 * @desc    Get all meal packages
 * @access  Private (Manager/Admin)
 */
router.get(
  '/meal-packages',
  authenticate,
  managerOrAdmin,
  getAllPackagesRules,
  validate,
  mealPackageController.getAllPackages
);

/**
 * @route   GET /api/admin/meal-packages/:id
 * @desc    Get package by ID
 * @access  Private (Manager/Admin)
 */
router.get(
  '/meal-packages/:id',
  authenticate,
  managerOrAdmin,
  getPackageByIdRules,
  validate,
  mealPackageController.getPackageById
);

/**
 * @route   PUT /api/admin/meal-packages/:id
 * @desc    Update meal package
 * @access  Private (Admin)
 */
router.put(
  '/meal-packages/:id',
  authenticate,
  adminOnly,
  updatePackageRules,
  validate,
  mealPackageController.updatePackage
);

/**
 * @route   PATCH /api/admin/meal-packages/:id/toggle
 * @desc    Toggle package active status
 * @access  Private (Admin)
 */
router.patch(
  '/meal-packages/:id/toggle',
  authenticate,
  adminOnly,
  mealPackageController.togglePackageStatus
);

/**
 * @route   DELETE /api/admin/meal-packages/:id
 * @desc    Soft delete package
 * @access  Private (Admin)
 */
router.delete(
  '/meal-packages/:id',
  authenticate,
  adminOnly,
  mealPackageController.deletePackage
);

/**
 * @route   GET /api/admin/meal-packages/:id/statistics
 * @desc    Get package statistics
 * @access  Private (Manager/Admin)
 */
router.get(
  '/meal-packages/:id/statistics',
  authenticate,
  managerOrAdmin,
  mealPackageController.getPackageStatistics
);

// =============================================
// ALLOWED ITEMS ROUTES
// =============================================

/**
 * @route   GET /api/admin/meal-packages/:id/allowed-items
 * @desc    Get all allowed items for package
 * @access  Private (Manager/Admin)
 */
router.get(
  '/meal-packages/:id/allowed-items',
  authenticate,
  managerOrAdmin,
  mealPackageController.getAllowedItems
);

/**
 * @route   POST /api/admin/meal-packages/:id/allowed-items
 * @desc    Add allowed item to package
 * @access  Private (Admin)
 */
router.post(
  '/meal-packages/:id/allowed-items',
  authenticate,
  adminOnly,
  addAllowedItemRules,
  validate,
  mealPackageController.addAllowedItem
);

/**
 * @route   POST /api/admin/meal-packages/:id/allowed-items/bulk
 * @desc    Bulk add items to package
 * @access  Private (Admin)
 */
router.post(
  '/meal-packages/:id/allowed-items/bulk',
  authenticate,
  adminOnly,
  bulkAddItemsRules,
  validate,
  mealPackageController.bulkAddItems
);

/**
 * @route   DELETE /api/admin/meal-packages/:id/allowed-items/:itemId
 * @desc    Remove allowed item from package
 * @access  Private (Admin)
 */
router.delete(
  '/meal-packages/:id/allowed-items/:itemId',
  authenticate,
  adminOnly,
  removeAllowedItemRules,
  validate,
  mealPackageController.removeAllowedItem
);

/**
 * @route   DELETE /api/admin/meal-packages/:id/allowed-items
 * @desc    Clear all allowed items from package
 * @access  Private (Admin)
 */
router.delete(
  '/meal-packages/:id/allowed-items',
  authenticate,
  adminOnly,
  mealPackageController.clearAllowedItems
);

// =============================================
// PACKAGE ASSIGNMENT ROUTES
// =============================================

/**
 * @route   POST /api/admin/customer-packages
 * @desc    Assign package to customer
 * @access  Private (Manager/Admin)
 */
router.post(
  '/customer-packages',
  authenticate,
  managerOrAdmin,
  idempotent('customer-packages:assign'),
  assignPackageRules,
  validate,
  packageAssignmentController.assignPackage
);

/**
 * @route   POST /api/admin/customer-packages/bulk
 * @desc    Bulk assign packages
 * @access  Private (Admin)
 */
router.post(
  '/customer-packages/bulk',
  authenticate,
  adminOnly,
  bulkAssignPackagesRules,
  validate,
  packageAssignmentController.bulkAssignPackages
);

/**
 * @route   GET /api/admin/customer-packages/active
 * @desc    Get all active packages
 * @access  Private (Manager/Admin)
 */
router.get(
  '/customer-packages/active',
  authenticate,
  managerOrAdmin,
  getAllActivePackagesRules,
  validate,
  packageAssignmentController.getAllActivePackages
);

/**
 * @route   GET /api/admin/customer-packages/expiring
 * @desc    Get expiring packages
 * @access  Private (Manager/Admin)
 */
router.get(
  '/customer-packages/expiring',
  authenticate,
  managerOrAdmin,
  getExpiringPackagesRules,
  validate,
  packageAssignmentController.getExpiringPackages
);

/**
 * @route   GET /api/admin/customer-packages/:id
 * @desc    Get package assignment by ID
 * @access  Private (Manager/Admin)
 */
router.get(
  '/customer-packages/:id',
  authenticate,
  managerOrAdmin,
  getAssignmentByIdRules,
  validate,
  packageAssignmentController.getAssignmentById
);

/**
 * @route   PUT /api/admin/customer-packages/:id
 * @desc    Update package assignment
 * @access  Private (Manager/Admin)
 */
router.put(
  '/customer-packages/:id',
  authenticate,
  managerOrAdmin,
  updateAssignmentRules,
  validate,
  packageAssignmentController.updateAssignment
);

/**
 * @route   POST /api/admin/customer-packages/:id/cancel
 * @desc    Cancel package assignment
 * @access  Private (Manager/Admin)
 */
router.post(
  '/customer-packages/:id/cancel',
  authenticate,
  managerOrAdmin,
  cancelAssignmentRules,
  validate,
  packageAssignmentController.cancelAssignment
);

/**
 * @route   POST /api/admin/customer-packages/:id/complete
 * @desc    Manually mark an active package assignment as completed
 * @access  Private (Manager/Admin)
 */
router.post(
  '/customer-packages/:id/complete',
  authenticate,
  managerOrAdmin,
  completeAssignmentRules,
  validate,
  packageAssignmentController.completeAssignment
);

/**
 * @route   POST /api/admin/customer-packages/:id/consumption
 * @desc    Record meal consumption
 * @access  Private (Manager/Admin)
 */
router.post(
  '/customer-packages/:id/consumption',
  authenticate,
  managerOrAdmin,
  recordConsumptionRules,
  validate,
  packageAssignmentController.recordConsumption
);

/**
 * @route   GET /api/admin/customer-packages/:id/consumption
 * @desc    Get consumption history
 * @access  Private (Manager/Admin)
 */
router.get(
  '/customer-packages/:id/consumption',
  authenticate,
  managerOrAdmin,
  getConsumptionHistoryRules,
  validate,
  packageAssignmentController.getConsumptionHistory
);

// =============================================
// CUSTOMER-SPECIFIC ROUTES
// =============================================

/**
 * @route   GET /api/admin/customers/:customerId/packages
 * @desc    Get packages for customer
 * @access  Private (Manager/Admin)
 */
router.get(
  '/customers/:customerId/packages',
  authenticate,
  managerOrAdmin,
  getCustomerPackagesRules,
  validate,
  packageAssignmentController.getCustomerPackages
);

/**
 * @route   GET /api/admin/customers/:customerId/packages/count
 * @desc    Get active package count for customer
 * @access  Private (Manager/Admin)
 */
router.get(
  '/customers/:customerId/packages/count',
  authenticate,
  managerOrAdmin,
  packageAssignmentController.getActivePackageCount
);

module.exports = router;
