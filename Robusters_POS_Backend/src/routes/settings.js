/**
 * Settings Routes
 * Application settings API endpoints.
 */

const express = require('express');
const router = express.Router();

const settingsController = require('../controllers/settingsController');
const { authenticate, adminOnly, managerOrAdmin } = require('../middleware/auth');

// GET /api/settings/public — tier + VIP thresholds for customer display (manager+admin)
router.get('/public', authenticate, managerOrAdmin, settingsController.getPublicSettings);

// GET /api/settings — all settings (admin only)
router.get('/', authenticate, adminOnly, settingsController.getAllSettings);

// PUT /api/settings/:key — update a setting (admin only)
router.put('/:key', authenticate, adminOnly, settingsController.updateSetting);

module.exports = router;
