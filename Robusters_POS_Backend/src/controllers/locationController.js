/**
 * Location Controller
 * Handles all location/branch management operations.
 */

const Location = require('../models/Location');
const { NotFoundError, BadRequestError } = require('../utils/errors');

/**
 * Create a new location
 * POST /api/locations
 */
const createLocation = async (req, res, next) => {
  try {
    const { name, address, phone } = req.body;

    if (!name || !name.trim()) {
      throw new BadRequestError('Location name is required');
    }

    const location = await Location.create({ name: name.trim(), address, phone });

    res.status(201).json({
      success: true,
      data: { location },
      message: 'Location created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all locations
 * GET /api/locations
 */
const getAllLocations = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const locations = await Location.findAll(includeInactive);

    res.json({
      success: true,
      data: { locations },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single location by ID
 * GET /api/locations/:id
 */
const getLocationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const location = await Location.findById(id);

    if (!location) {
      throw new NotFoundError('Location not found');
    }

    res.json({
      success: true,
      data: { location },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a location
 * PATCH /api/locations/:id
 */
const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, address, phone } = req.body;

    const existing = await Location.findById(id);
    if (!existing) {
      throw new NotFoundError('Location not found');
    }

    if (name !== undefined && !name.trim()) {
      throw new BadRequestError('Location name cannot be empty');
    }

    const location = await Location.update(id, {
      name: name?.trim(),
      address,
      phone,
    });

    res.json({
      success: true,
      data: { location },
      message: 'Location updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate (soft-delete) a location
 * DELETE /api/locations/:id
 */
const deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const location = await Location.deactivate(id);
    if (!location) {
      throw new NotFoundError('Location not found');
    }

    res.json({
      success: true,
      data: { location },
      message: 'Location deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
};
