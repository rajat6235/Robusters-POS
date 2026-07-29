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
  let isOperational = err.isOperational || false;

  // Handle specific error types
  if (err.name === 'ValidationError' && err.errors) {
    // Express-validator errors
    statusCode = 422;
    code = 'VALIDATION_ERROR';
  }

  // Map raw Postgres constraint violations to friendly, safe responses
  // instead of letting the driver's own message (which can name internal
  // columns/constraints) reach the client.
  if (err.code === '23505') { // unique_violation
    statusCode = 409;
    code = 'CONFLICT';
    message = 'This record already exists or was already processed.';
    isOperational = true;
  } else if (err.code === '23514') { // check_violation
    statusCode = 400;
    code = 'BAD_REQUEST';
    message = 'This action is not allowed — it would violate a data limit (e.g. exceeding an available quantity).';
    isOperational = true;
  } else if (err.code === '23503') { // foreign_key_violation
    statusCode = 400;
    code = 'BAD_REQUEST';
    message = 'This action references a record that no longer exists.';
    isOperational = true;
  }

  // Handle database connection errors (e.g. Render free plan expiry)
  if (
    err.message === 'Connection terminated unexpectedly' ||
    err.message?.includes('Connection terminated') ||
    err.code === 'ECONNRESET' ||
    err.code === 'ECONNREFUSED' ||
    err.code === '57P01' // admin_shutdown (Render kills expired DB)
  ) {
    statusCode = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'Database unavailable. Your Render database plan may have expired — please upgrade to resume service.';
    isOperational = true;
  }

  // Always log the real error server-side (never hidden — needed for debugging production)
  if (config.env === 'development') {
    console.error('Error:', { message: err.message, stack: err.stack, statusCode });
  } else {
    // In production: always log full error so Render logs show the real cause
    console.error(`[${code}] ${err.message}`, err.stack || '');
  }

  // Don't leak error details in production for non-operational errors
  if (config.env === 'production' && !isOperational) {
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
