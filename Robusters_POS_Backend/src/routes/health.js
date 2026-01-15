/**
 * Health Check Routes
 * Provides endpoints for monitoring application health.
 */

const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const config = require('../config');

/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check including database status
 * @access  Public
 */
router.get('/detailed', async (req, res) => {
  const health = {
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.env,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: { status: 'unknown' },
    },
  };

  // Check database connection
  try {
    const startTime = Date.now();
    await db.query('SELECT 1');
    const responseTime = Date.now() - startTime;

    health.checks.database = {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.success = false;
    health.checks.database = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  const statusCode = health.success ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
