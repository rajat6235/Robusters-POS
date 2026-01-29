/**
 * Location Routes
 * All location/branch management API endpoints.
 */

const express = require('express');
const router = express.Router();

const locationController = require('../controllers/locationController');
const { authenticate, adminOnly, managerOrAdmin } = require('../middleware/auth');

/**
 * @route   POST /api/locations
 * @desc    Create a new location
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  adminOnly,
  locationController.createLocation
);

/**
 * @route   GET /api/locations
 * @desc    Get all locations
 * @access  Private (Manager/Admin)
 */
router.get(
  '/',
  authenticate,
  managerOrAdmin,
  locationController.getAllLocations
);

/**
 * @route   GET /api/locations/:id
 * @desc    Get a single location
 * @access  Private (Manager/Admin)
 */
router.get(
  '/:id',
  authenticate,
  managerOrAdmin,
  locationController.getLocationById
);

/**
 * @route   PATCH /api/locations/:id
 * @desc    Update a location
 * @access  Private (Admin only)
 */
router.patch(
  '/:id',
  authenticate,
  adminOnly,
  locationController.updateLocation
);

/**
 * @route   DELETE /api/locations/:id
 * @desc    Deactivate a location
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  adminOnly,
  locationController.deleteLocation
);

module.exports = router;
