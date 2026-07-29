/**
 * Meal Package Order Validators
 * Input validation for OTP-based meal package orders
 */

const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

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
// CUSTOMER LOOKUP
// =============================================

const lookupCustomerRules = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
];

// =============================================
// ALLOWED ITEMS
// =============================================

const getAllowedItemsRules = [
  param('customerPackageId')
    .isUUID()
    .withMessage('customerPackageId must be a valid UUID'),
];

// =============================================
// OTP REQUEST
// =============================================

const requestOTPRules = [
  body('customerPackageId')
    .isUUID()
    .withMessage('customerPackageId must be a valid UUID'),

  body('orderItems')
    .isArray({ min: 1 })
    .withMessage('orderItems must be a non-empty array'),

  body('orderItems.*.menuItemId')
    .isUUID()
    .withMessage('Each orderItem must have a valid menuItemId'),

  body('orderItems.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Each orderItem must have a positive quantity'),

  body('orderItems.*.name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Item name must be 1-200 characters'),

  body('orderItems.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Item price must be non-negative'),

  body('orderItems.*.variantId')
    .optional()
    .isUUID()
    .withMessage('variantId must be a valid UUID'),

  body('orderItems.*.categoryId')
    .optional()
    .isUUID()
    .withMessage('categoryId must be a valid UUID'),
];

// =============================================
// OTP VERIFICATION & ORDER CREATION
// =============================================

const verifyOTPAndCreateOrderRules = [
  body('customerPackageId')
    .isUUID()
    .withMessage('customerPackageId must be a valid UUID'),

  // Optional while OTP verification is temporarily disabled (see otpService.OTP_ENABLED)
  body('otp')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('OTP must be 6 digits'),

  body('orderItems')
    .isArray({ min: 1 })
    .withMessage('orderItems must be a non-empty array'),

  body('orderItems.*.menuItemId')
    .isUUID()
    .withMessage('Each orderItem must have a valid menuItemId'),

  body('orderItems.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Each orderItem must have a positive quantity'),

  body('orderItems.*.name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Item name must be 1-200 characters'),

  body('orderItems.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Item price must be non-negative'),

  body('orderItems.*.variantId')
    .optional()
    .isUUID()
    .withMessage('variantId must be a valid UUID'),

  body('orderItems.*.categoryId')
    .optional()
    .isUUID()
    .withMessage('categoryId must be a valid UUID'),

  body('mealsToConsume')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('mealsToConsume must be between 1 and 10'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

// =============================================
// DASHBOARD
// =============================================

const getDashboardRules = [
  query('status')
    .optional()
    .isIn(['active', 'completed', 'expired', 'cancelled', 'all'])
    .withMessage('status must be active, completed, expired, cancelled, or all'),

  query('search')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('search must be a 10-digit phone number'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];

// =============================================
// CONSUMPTION HISTORY
// =============================================

const getConsumptionHistoryRules = [
  param('customerPackageId')
    .isUUID()
    .withMessage('customerPackageId must be a valid UUID'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];

module.exports = {
  lookupCustomerRules,
  getAllowedItemsRules,
  requestOTPRules,
  verifyOTPAndCreateOrderRules,
  getDashboardRules,
  getConsumptionHistoryRules,
  validate,
};
