/**
 * Menu Validators
 * Input validation for menu-related endpoints.
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
// CATEGORY VALIDATORS
// =============================================

const createCategoryRules = [
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

  body('imageUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Image URL must be a valid URL'),

  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer'),
];

const updateCategoryRules = [
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

  body('imageUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Image URL must be a valid URL'),

  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

const reorderCategoriesRules = [
  body('orders')
    .isArray({ min: 1 })
    .withMessage('Orders must be a non-empty array'),

  body('orders.*.id')
    .isUUID()
    .withMessage('Each order must have a valid UUID id'),

  body('orders.*.displayOrder')
    .isInt({ min: 0 })
    .withMessage('Each order must have a non-negative displayOrder'),
];

// =============================================
// MENU ITEM VALIDATORS
// =============================================

const createMenuItemRules = [
  body('categoryId')
    .notEmpty()
    .withMessage('Category ID is required')
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 150 })
    .withMessage('Name must be 2-150 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('dietType')
    .optional()
    .isIn(['VEGAN', 'VEG', 'EGGETARIAN', 'NON_VEG'])
    .withMessage('Diet type must be VEGAN, VEG, EGGETARIAN, or NON_VEG'),

  body('basePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Base price must be a non-negative number'),

  body('hasVariants')
    .optional()
    .isBoolean()
    .withMessage('hasVariants must be a boolean'),

  body('variantType')
    .optional()
    .isIn(['SIZE', 'PORTION', 'CARB_TYPE', 'CUSTOM'])
    .withMessage('Variant type must be SIZE, PORTION, CARB_TYPE, or CUSTOM'),

  body('calories')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Calories must be a non-negative integer'),

  body('proteinGrams')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Protein grams must be a non-negative number'),

  body('carbsGrams')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Carbs grams must be a non-negative number'),

  body('fatGrams')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fat grams must be a non-negative number'),

  body('fiberGrams')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fiber grams must be a non-negative number'),

  body('variants')
    .optional()
    .isArray()
    .withMessage('Variants must be an array'),

  body('variants.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Variant name is required'),

  body('variants.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Variant price must be a non-negative number'),
];

const updateMenuItemRules = [
  uuidParam('id'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Name must be 2-150 characters'),

  body('dietType')
    .optional()
    .isIn(['VEGAN', 'VEG', 'EGGETARIAN', 'NON_VEG'])
    .withMessage('Diet type must be VEGAN, VEG, EGGETARIAN, or NON_VEG'),

  body('basePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Base price must be a non-negative number'),

  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),
];

// =============================================
// VARIANT VALIDATORS
// =============================================

const createVariantRules = [
  uuidParam('itemId'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Variant name is required')
    .isLength({ max: 50 })
    .withMessage('Variant name cannot exceed 50 characters'),

  body('label')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Label cannot exceed 100 characters'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),

  body('calories')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Calories must be a non-negative integer'),

  body('proteinGrams')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Protein grams must be a non-negative number'),

  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer'),
];

const updateVariantRules = [
  uuidParam('id'),

  body('name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Variant name cannot exceed 50 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),

  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),
];

// =============================================
// ADDON VALIDATORS
// =============================================

const createAddonRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),

  body('unit')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Unit cannot exceed 50 characters'),

  body('unitQuantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit quantity must be a non-negative number'),

  body('addonGroup')
    .optional()
    .isIn(['proteins', 'carbs', 'extras', 'dressings', 'salads'])
    .withMessage('Invalid addon group'),

  body('calories')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Calories must be a non-negative integer'),

  body('proteinGrams')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Protein grams must be a non-negative number'),
];

const updateAddonRules = [
  uuidParam('id'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),

  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),
];

const linkAddonRules = [
  uuidParam('categoryId'),

  body('addonId')
    .notEmpty()
    .withMessage('Addon ID is required')
    .isUUID()
    .withMessage('Addon ID must be a valid UUID'),

  body('priceOverride')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price override must be a non-negative number'),
];

// =============================================
// PRICE CALCULATION VALIDATORS
// =============================================

const calculatePriceRules = [
  body('menuItemId')
    .notEmpty()
    .withMessage('Menu item ID is required')
    .isUUID()
    .withMessage('Menu item ID must be a valid UUID'),

  body('variantId')
    .optional()
    .isUUID()
    .withMessage('Variant ID must be a valid UUID'),

  body('addons')
    .optional()
    .isArray()
    .withMessage('Addons must be an array'),

  body('addons.*.addonId')
    .optional()
    .isUUID()
    .withMessage('Addon ID must be a valid UUID'),

  body('addons.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
];

const calculateOrderRules = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),

  body('items.*.menuItemId')
    .isUUID()
    .withMessage('Menu item ID must be a valid UUID'),

  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
];

// =============================================
// SEARCH VALIDATOR
// =============================================

const searchRules = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
];

module.exports = {
  validate,
  uuidParam,

  // Category
  createCategoryRules,
  updateCategoryRules,
  reorderCategoriesRules,

  // Menu Item
  createMenuItemRules,
  updateMenuItemRules,

  // Variant
  createVariantRules,
  updateVariantRules,

  // Addon
  createAddonRules,
  updateAddonRules,
  linkAddonRules,

  // Price Calculation
  calculatePriceRules,
  calculateOrderRules,

  // Search
  searchRules,
};
