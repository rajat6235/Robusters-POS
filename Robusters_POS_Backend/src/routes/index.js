/**
 * Main Router
 * Aggregates all route modules.
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const healthRoutes = require('./health');
const menuRoutes = require('./menu');
const orderRoutes = require('./orders');
const customerRoutes = require('./customers');
const activityLogRoutes = require('./activityLogs');
const dashboardRoutes = require('./dashboard');

// Mount routes
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/customers', customerRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
