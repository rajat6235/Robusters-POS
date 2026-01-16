/**
 * Main Router
 * Aggregates all route modules.
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const healthRoutes = require('./health');
const menuRoutes = require('./menu');

// Mount routes
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/menu', menuRoutes);

module.exports = router;
