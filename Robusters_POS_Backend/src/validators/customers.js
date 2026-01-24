const { body, param, query } = require('express-validator');

const createCustomerValidation = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[\d\s\-\(\)]{10,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .trim(),
  
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name must not exceed 50 characters')
    .trim(),
  
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth (YYYY-MM-DD)')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 13 || age > 120) {
        throw new Error('Age must be between 13 and 120 years');
      }
      
      return true;
    })
];

const updateCustomerValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid customer ID'),
  
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]{10,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .trim(),
  
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name must not exceed 50 characters')
    .trim(),
  
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth (YYYY-MM-DD)')
    .custom((value) => {
      if (!value) return true;
      
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 13 || age > 120) {
        throw new Error('Age must be between 13 and 120 years');
      }
      
      return true;
    })
];

const findOrCreateCustomerValidation = [
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]{10,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .trim(),
  
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name must not exceed 50 characters')
    .trim(),
  
  // At least phone or email must be provided
  body()
    .custom((value) => {
      if (!value.phone && !value.email) {
        throw new Error('Either phone number or email is required');
      }
      return true;
    })
];

const updatePreferencesValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid customer ID'),
  
  body('dietaryRestrictions')
    .optional()
    .isArray()
    .withMessage('Dietary restrictions must be an array')
    .custom((value) => {
      const validRestrictions = [
        'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 
        'nut-free', 'low-carb', 'keto', 'paleo', 'halal', 'kosher'
      ];
      
      if (value && value.some(restriction => !validRestrictions.includes(restriction))) {
        throw new Error('Invalid dietary restriction provided');
      }
      
      return true;
    }),
  
  body('allergies')
    .optional()
    .isArray()
    .withMessage('Allergies must be an array')
    .custom((value) => {
      const validAllergies = [
        'nuts', 'dairy', 'eggs', 'soy', 'wheat', 'shellfish', 
        'fish', 'sesame', 'mustard', 'celery', 'lupin', 'sulphites'
      ];
      
      if (value && value.some(allergy => !validAllergies.includes(allergy))) {
        throw new Error('Invalid allergy provided');
      }
      
      return true;
    }),
  
  body('favoriteItems')
    .optional()
    .isArray()
    .withMessage('Favorite items must be an array')
    .custom((value) => {
      if (value && value.some(item => typeof item !== 'string')) {
        throw new Error('Favorite items must be an array of item IDs');
      }
      
      return true;
    }),
  
  body('preferredPaymentMethod')
    .optional()
    .isIn(['CASH', 'CARD', 'UPI', 'WALLET'])
    .withMessage('Invalid payment method'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
    .trim()
];

const getCustomersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters')
    .trim()
];

const getCustomerOrdersValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid customer ID'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

const customerIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid customer ID')
];

const searchCustomersValidation = [
  query('query')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Search query must be between 3 and 100 characters')
    .trim()
];

const getTopCustomersValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

module.exports = {
  createCustomerValidation,
  updateCustomerValidation,
  findOrCreateCustomerValidation,
  updatePreferencesValidation,
  getCustomersValidation,
  getCustomerOrdersValidation,
  customerIdValidation,
  searchCustomersValidation,
  getTopCustomersValidation
};