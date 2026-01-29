/**
 * Express Application Configuration
 * Sets up middleware, routes, and error handling.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security middleware
// Helmet sets various HTTP headers for security
app.use(helmet());

// CORS configuration
// In production, restrict origins to your frontend domain
app.use(cors({
  origin: config.env === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : true, // reflects request origin (required when credentials: true)
  credentials: true,
}));

// Request logging
// 'dev' format for development, 'combined' for production
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

// Body parsing middleware
app.use(express.json({ limit: '10kb' })); // Limit body size for security
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Robusters POS API',
    version: '1.0.0',
    documentation: '/api/health for health check',
  });
});

// Handle 404 routes
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
