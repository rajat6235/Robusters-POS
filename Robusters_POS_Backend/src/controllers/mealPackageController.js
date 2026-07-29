/**
 * Meal Package Controller
 * Handles CRUD operations for meal packages
 */

const MealPackage = require('../models/MealPackage');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
const { logPackageActivity } = require('../utils/packageActivityLogger');

/**
 * Create new meal package
 * POST /api/admin/meal-packages
 */
const createPackage = async (req, res, next) => {
  try {
    const { name, description, mealCount, price, validityDays } = req.body;
    const userId = req.user.id;

    const package = await MealPackage.create({
      name,
      description,
      mealCount,
      price,
      validityDays,
      createdBy: userId,
    });

    // Log activity
    await logPackageActivity({
      entityType: 'package',
      entityId: package.id,
      action: 'package_created',
      performedBy: userId,
      packageId: package.id,
      changes: {
        before: null,
        after: package,
      },
      metadata: {
        name,
        mealCount,
        price,
      },
    });

    res.status(201).json({
      success: true,
      data: { package },
      message: 'Meal package created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all meal packages
 * GET /api/admin/meal-packages
 */
const getAllPackages = async (req, res, next) => {
  try {
    const { isActive, mealCount, limit, offset } = req.query;

    const { packages, total } = await MealPackage.findAll({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      mealCount: mealCount ? parseInt(mealCount, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    res.json({
      success: true,
      data: { packages, count: total },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get package by ID
 * GET /api/admin/meal-packages/:id
 */
const getPackageById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { includeItems } = req.query;

    let package;
    if (includeItems === 'true') {
      package = await MealPackage.findByIdWithItems(id);
    } else {
      package = await MealPackage.findById(id);
    }

    if (!package) {
      throw new NotFoundError('Meal package not found');
    }

    res.json({
      success: true,
      data: { package },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update meal package
 * PUT /api/admin/meal-packages/:id
 */
const updatePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, mealCount, price, validityDays } = req.body;
    const userId = req.user.id;

    // Get current state
    const before = await MealPackage.findById(id);
    if (!before) {
      throw new NotFoundError('Meal package not found');
    }

    const package = await MealPackage.update(id, {
      name,
      description,
      mealCount,
      price,
      validityDays,
    });

    // Log activity
    await logPackageActivity({
      entityType: 'package',
      entityId: id,
      action: 'package_updated',
      performedBy: userId,
      packageId: id,
      changes: {
        before,
        after: package,
      },
    });

    res.json({
      success: true,
      data: { package },
      message: 'Meal package updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle package active status
 * PATCH /api/admin/meal-packages/:id/toggle
 */
const togglePackageStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const before = await MealPackage.findById(id);
    if (!before) {
      throw new NotFoundError('Meal package not found');
    }

    const package = await MealPackage.toggleActive(id);

    // Log activity
    await logPackageActivity({
      entityType: 'package',
      entityId: id,
      action: package.is_active ? 'package_activated' : 'package_deactivated',
      performedBy: userId,
      packageId: id,
      changes: {
        before: { is_active: before.is_active },
        after: { is_active: package.is_active },
      },
    });

    res.json({
      success: true,
      data: { package },
      message: `Meal package ${package.is_active ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Hard delete package
 * DELETE /api/admin/meal-packages/:id
 */
const deletePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const before = await MealPackage.findById(id);
    if (!before) {
      throw new NotFoundError('Meal package not found');
    }

    await MealPackage.hardDelete(id);

    // Log activity (package_id intentionally omitted — row is gone)
    await logPackageActivity({
      entityType: 'package',
      entityId: id,
      action: 'package_deleted',
      performedBy: userId,
      changes: { before, after: null },
    });

    res.json({
      success: true,
      message: 'Meal package deleted successfully',
    });
  } catch (error) {
    // PostgreSQL FK violation — customer assignments still reference this package
    if (error.code === '23503') {
      return next(new ConflictError(
        'Cannot delete this package because customers are assigned to it. ' +
        'Cancel or complete all customer assignments first.'
      ));
    }
    next(error);
  }
};

/**
 * Add allowed item to package
 * POST /api/admin/meal-packages/:id/allowed-items
 */
const addAllowedItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { menuItemId, variantId, categoryId, maxQuantity } = req.body;
    const userId = req.user.id;

    // Verify package exists
    const package = await MealPackage.findById(id);
    if (!package) {
      throw new NotFoundError('Meal package not found');
    }

    // Validate: must have either menuItemId or categoryId
    if (!menuItemId && !categoryId) {
      throw new BadRequestError('Either menuItemId or categoryId must be provided');
    }

    const allowedItem = await MealPackage.addAllowedItem(id, {
      menuItemId,
      variantId,
      categoryId,
      maxQuantity,
    });

    if (!allowedItem) {
      throw new ConflictError('This item is already allowed for this package.');
    }

    // Log activity
    await logPackageActivity({
      entityType: 'package',
      entityId: id,
      action: 'allowed_item_added',
      performedBy: userId,
      packageId: id,
      metadata: {
        allowedItemId: allowedItem.id,
        menuItemId,
        variantId,
        categoryId,
        maxQuantity,
      },
    });

    res.status(201).json({
      success: true,
      data: { allowedItem },
      message: 'Allowed item added successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove allowed item from package
 * DELETE /api/admin/meal-packages/:id/allowed-items/:itemId
 */
const removeAllowedItem = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const userId = req.user.id;

    const removed = await MealPackage.removeAllowedItem(id, itemId);

    if (!removed) {
      throw new NotFoundError('Allowed item not found');
    }

    // Log activity
    await logPackageActivity({
      entityType: 'package',
      entityId: id,
      action: 'allowed_item_removed',
      performedBy: userId,
      packageId: id,
      metadata: {
        allowedItemId: itemId,
      },
    });

    res.json({
      success: true,
      message: 'Allowed item removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all allowed items for package
 * GET /api/admin/meal-packages/:id/allowed-items
 */
const getAllowedItems = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify package exists
    const package = await MealPackage.findById(id);
    if (!package) {
      throw new NotFoundError('Meal package not found');
    }

    const allowedItems = await MealPackage.getAllowedItems(id);

    res.json({
      success: true,
      data: { allowedItems, count: allowedItems.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk add items to package
 * POST /api/admin/meal-packages/:id/allowed-items/bulk
 */
const bulkAddItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const userId = req.user.id;

    // Verify package exists
    const package = await MealPackage.findById(id);
    if (!package) {
      throw new NotFoundError('Meal package not found');
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Items array is required and must not be empty');
    }

    const addedItems = await MealPackage.bulkAddItems(id, items);

    // Log activity
    await logPackageActivity({
      entityType: 'package',
      entityId: id,
      action: 'bulk_items_added',
      performedBy: userId,
      packageId: id,
      metadata: {
        itemsCount: addedItems.length,
        items: addedItems.map(item => item.id),
      },
    });

    res.status(201).json({
      success: true,
      data: { addedItems, count: addedItems.length },
      message: `${addedItems.length} items added successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all allowed items from package
 * DELETE /api/admin/meal-packages/:id/allowed-items
 */
const clearAllowedItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify package exists
    const package = await MealPackage.findById(id);
    if (!package) {
      throw new NotFoundError('Meal package not found');
    }

    const deletedCount = await MealPackage.clearAllowedItems(id);

    // Log activity
    await logPackageActivity({
      entityType: 'package',
      entityId: id,
      action: 'all_items_cleared',
      performedBy: userId,
      packageId: id,
      metadata: {
        deletedCount,
      },
    });

    res.json({
      success: true,
      message: `${deletedCount} allowed items removed successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get package statistics
 * GET /api/admin/meal-packages/:id/statistics
 */
const getPackageStatistics = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify package exists
    const package = await MealPackage.findById(id);
    if (!package) {
      throw new NotFoundError('Meal package not found');
    }

    const statistics = await MealPackage.getStatistics(id);

    res.json({
      success: true,
      data: { statistics },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPackage,
  getAllPackages,
  getPackageById,
  updatePackage,
  togglePackageStatus,
  deletePackage,
  addAllowedItem,
  removeAllowedItem,
  getAllowedItems,
  bulkAddItems,
  clearAllowedItems,
  getPackageStatistics,
};
