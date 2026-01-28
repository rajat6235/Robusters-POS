/**
 * Order Validators
 * Input validation for order endpoints using express-validator.
 */

const { body, param, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const Order = require('../models/Order');

/**
 * UUID parameter validation
 */
const uuidParam = (paramName) => 
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`);

/**
 * Validation rules for creating an order
 */
const createOrderRules = [
  body('customerPhone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number format'),

  body('customerName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be 2-100 characters'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),

  body('items.*.itemId')
    .isUUID()
    .withMessage('Item ID must be a valid UUID'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),

  body('items.*.variantIds')
    .optional()
    .isArray()
    .withMessage('Variant IDs must be an array'),

  body('items.*.variantIds.*')
    .optional()
    .isUUID()
    .withMessage('Variant ID must be a valid UUID'),

  body('items.*.addonSelections')
    .optional()
    .isArray()
    .withMessage('Addon selections must be an array'),

  body('items.*.addonSelections.*.addonId')
    .optional()
    .isUUID()
    .withMessage('Addon ID must be a valid UUID'),

  body('items.*.addonSelections.*.quantity')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Addon quantity must be between 1 and 10'),

  body('items.*.specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special instructions must be less than 500 characters'),

  body('paymentMethod')
    .isIn(Object.values(Order.PAYMENT_METHODS))
    .withMessage('Invalid payment method'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
];

/**
 * Validation rules for updating payment status
 */
const updatePaymentStatusRules = [
  body('paymentStatus')
    .isIn(Object.values(Order.PAYMENT_STATUS))
    .withMessage('Invalid payment status'),
];

/**
 * Middleware to check validation results
 * Throws ValidationError if there are errors
 */
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

module.exports = {
  uuidParam,
  createOrderRules,
  updatePaymentStatusRules,
  validate,
};