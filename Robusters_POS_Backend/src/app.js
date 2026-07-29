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

// Trust the first proxy in front of Express (nginx, load balancer, etc.)
// This makes req.ip use the X-Forwarded-For header instead of the socket address,
// which is why the activity log was recording ::1 (loopback) instead of the real IP.
app.set('trust proxy', 1);

// Security middleware
// Helmet sets various HTTP headers for security
app.use(helmet());

// CORS configuration
const allowedOrigins = config.env === 'production'
  ? (process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) || [])
  : null;

app.use(cors({
  origin: allowedOrigins === null
    ? true
    : (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Render health checks)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
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
