/**
 * Meal Package Validators
 * Input validation for meal package endpoints.
 */

const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

// =============================================
// COMMON VALIDATORS
// =============================================

const uuidParam = (paramName) =>
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`);

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    throw new ValidationError('Validation failed', errorMessages);
  }

  next();
};

// =============================================
// MEAL PACKAGE VALIDATORS
// =============================================

const createPackageRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('mealCount')
    .isInt({ min: 1 })
    .withMessage('Meal count must be a positive integer'),

  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),

  body('validityDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Validity days must be a positive integer'),
];

const updatePackageRules = [
  uuidParam('id'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('mealCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Meal count must be a positive integer'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),

  body('validityDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Validity days must be a positive integer'),
];

const getPackageByIdRules = [
  uuidParam('id'),

  query('includeItems')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('includeItems must be true or false'),
];

const getAllPackagesRules = [
  query('isActive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isActive must be true or false'),

  query('mealCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('mealCount must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];

const addAllowedItemRules = [
  uuidParam('id'),

  body('menuItemId')
    .optional()
    .isUUID()
    .withMessage('menuItemId must be a valid UUID'),

  body('variantId')
    .optional()
    .isUUID()
    .withMessage('variantId must be a valid UUID'),

  body('categoryId')
    .optional()
    .isUUID()
    .withMessage('categoryId must be a valid UUID'),

  body('maxQuantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('maxQuantity must be a positive integer'),

  body().custom((value) => {
    if (value.menuItemId && value.categoryId) {
      throw new Error('Provide either menuItemId or categoryId, not both');
    }
    return true;
  }),
];

const removeAllowedItemRules = [
  uuidParam('id'),
  uuidParam('itemId'),
];

const bulkAddItemsRules = [
  uuidParam('id'),

  body('items')
    .isArray({ min: 1, max: 200 })
    .withMessage('Items must be a non-empty array of at most 200'),

  body('items.*.menuItemId')
    .optional()
    .isUUID()
    .withMessage('Each item menuItemId must be a valid UUID'),

  body('items.*.variantId')
    .optional()
    .isUUID()
    .withMessage('Each item variantId must be a valid UUID'),

  body('items.*.categoryId')
    .optional()
    .isUUID()
    .withMessage('Each item categoryId must be a valid UUID'),

  body('items.*.maxQuantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Each item maxQuantity must be a positive integer'),

  body('items').custom((items) => {
    if (!Array.isArray(items)) return true;
    const invalid = items.some((item) => item.menuItemId && item.categoryId);
    if (invalid) {
      throw new Error('Each item must provide either menuItemId or categoryId, not both');
    }
    return true;
  }),
];

// =============================================
// PACKAGE ASSIGNMENT VALIDATORS
// =============================================

const assignPackageRules = [
  body('customerId')
    .isUUID()
    .withMessage('customerId must be a valid UUID'),

  body('packageId')
    .isUUID()
    .withMessage('packageId must be a valid UUID'),

  body('totalMeals')
    .optional()
    .isInt({ min: 1 })
    .withMessage('totalMeals must be a positive integer'),

  body('consumedMeals')
    .optional()
    .isInt({ min: 0 })
    .withMessage('consumedMeals must be a non-negative integer'),

  body('packagePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('packagePrice must be a non-negative number'),

  body('amountPaid')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('amountPaid must be a non-negative number'),

  body('paymentStatus')
    .optional()
    .isIn(['pending', 'partial', 'paid'])
    .withMessage('paymentStatus must be pending, partial, or paid'),

  body('startsAt')
    .optional()
    .isISO8601()
    .withMessage('startsAt must be a valid date'),

  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('expiresAt must be a valid date'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

const updateAssignmentRules = [
  uuidParam('id'),

  body('totalMeals')
    .optional()
    .isInt({ min: 1 })
    .withMessage('totalMeals must be a positive integer'),

  body('packagePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('packagePrice must be a non-negative number'),

  body('amountPaid')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('amountPaid must be a non-negative number'),

  body('paymentStatus')
    .optional()
    .isIn(['pending', 'partial', 'paid'])
    .withMessage('paymentStatus must be pending, partial, or paid'),

  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('expiresAt must be a valid date'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

const cancelAssignmentRules = [
  uuidParam('id'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),
];

const completeAssignmentRules = [
  uuidParam('id'),
];

const recordConsumptionRules = [
  uuidParam('id'),

  body('orderId')
    .isUUID()
    .withMessage('orderId must be a valid UUID'),

  body('mealsConsumed')
    .optional()
    .isInt({ min: 1 })
    .withMessage('mealsConsumed must be a positive integer'),

  body('orderTotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('orderTotal must be a non-negative number'),

  body('orderItems')
    .optional()
    .isArray()
    .withMessage('orderItems must be an array'),
];

const getCustomerPackagesRules = [
  uuidParam('customerId'),

  query('status')
    .optional()
    .isIn(['active', 'completed', 'expired', 'cancelled'])
    .withMessage('status must be active, completed, expired, or cancelled'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];

const getAssignmentByIdRules = [
  uuidParam('id'),

  query('includeConsumption')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('includeConsumption must be true or false'),
];

const getConsumptionHistoryRules = [
  uuidParam('id'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];

const getAllActivePackagesRules = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];

const getExpiringPackagesRules = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
];

const bulkAssignPackagesRules = [
  body('assignments')
    .isArray({ min: 1, max: 100 })
    .withMessage('Assignments must be a non-empty array of at most 100'),

  body('assignments.*.customerId')
    .isUUID()
    .withMessage('Each assignment customerId must be a valid UUID'),

  body('assignments.*.packageId')
    .isUUID()
    .withMessage('Each assignment packageId must be a valid UUID'),

  body('assignments.*.totalMeals')
    .isInt({ min: 1 })
    .withMessage('Each assignment totalMeals must be a positive integer'),

  body('assignments.*.packagePrice')
    .isFloat({ min: 0 })
    .withMessage('Each assignment packagePrice must be a non-negative number'),

  body('assignments.*.startsAt')
    .isISO8601()
    .withMessage('Each assignment startsAt must be a valid date'),
];

module.exports = {
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

  // Common
  validate,
};
