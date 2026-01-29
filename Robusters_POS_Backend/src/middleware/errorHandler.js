/**
 * Error Handling Middleware
 * Centralized error handling for consistent API responses.
 */

const config = require('../config');
const { AppError } = require('../utils/errors');

/**
 * Handle 404 Not Found routes
 */
const notFound = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND');
  next(error);
};

/**
 * Global error handler
 * Formats errors consistently and hides sensitive info in production.
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 Internal Server Error
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle specific error types
  if (err.name === 'ValidationError' && err.errors) {
    // Express-validator errors
    statusCode = 422;
    code = 'VALIDATION_ERROR';
  }

  // Log error (more details in development)
  if (config.env === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  } else {
    // In production, only log operational errors briefly
    if (err.isOperational) {
      console.error(`[${code}] ${message}`);
    } else {
      // Log full error for unexpected errors
      console.error('Unexpected error:', err);
    }
  }

  // Don't leak error details in production for non-operational errors
  if (config.env === 'production' && !err.isOperational) {
    message = 'An unexpected error occurred';
    code = 'INTERNAL_ERROR';
  }

  // Build response
  const response = {
    success: false,
    message,
    error: {
      code,
      message,
    },
  };

  // Include validation errors if present
  if (err.errors && Array.isArray(err.errors)) {
    response.error.details = err.errors;
  }

  // Include stack trace in development
  if (config.env === 'development') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  notFound,
  errorHandler,
};
