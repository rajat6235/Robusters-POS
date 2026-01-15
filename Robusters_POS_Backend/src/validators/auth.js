/**
 * Authentication Validators
 * Input validation for auth endpoints using express-validator.
 */

const { body, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Validation rules for login
 */
const loginRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Validation rules for user registration (admin only)
 */
const registerRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),

  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be 2-100 characters'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be 2-100 characters'),

  body('role')
    .optional()
    .isIn(['ADMIN', 'MANAGER'])
    .withMessage('Role must be ADMIN or MANAGER'),
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
  loginRules,
  registerRules,
  validate,
};
