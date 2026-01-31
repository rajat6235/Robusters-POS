/**
 * Menu Controller
 * Handles all menu-related operations: categories, items, variants, add-ons.
 */

const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const ItemVariant = require('../models/ItemVariant');
const Addon = require('../models/Addon');
const { calculateItemPrice, calculateOrderTotal } = require('../utils/priceCalculator');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');
const { toCamelCase } = require('../utils/caseConverter');

// =============================================
// CATEGORY CONTROLLERS
// =============================================

/**
 * Get all categories
 * GET /api/menu/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const { includeCount } = req.query;
    const activeOnly = req.query.activeOnly !== 'false';

    let categories;
    if (includeCount === 'true') {
      categories = await Category.findAllWithItemCounts();
    } else {
      categories = await Category.findAll({ activeOnly });
    }

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single category
 * GET /api/menu/categories/:id
 */
const getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findWithItemCount(id);

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    res.json({
      success: true,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create category
 * POST /api/menu/categories
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, description, imageUrl, displayOrder } = req.body;

    // Check for duplicate slug
    const existing = await Category.findBySlug(Category.createSlug(name));
    if (existing) {
      throw new ConflictError('Category with this name already exists');
    }

    const category = await Category.create({ name, description, imageUrl, displayOrder });

    res.status(201).json({
      success: true,
      data: { category },
      message: 'Category created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 * PUT /api/menu/categories/:id
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, displayOrder, isActive } = req.body;

    const category = await Category.update(id, { name, description, imageUrl, displayOrder, isActive });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    res.json({
      success: true,
      data: { category },
      message: 'Category updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category
 * DELETE /api/menu/categories/:id
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Category.remove(id);

    if (!deleted) {
      throw new NotFoundError('Category not found');
    }

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder categories
 * PUT /api/menu/categories/reorder
 */
const reorderCategories = async (req, res, next) => {
  try {
    const { orders } = req.body; // [{id, displayOrder}, ...]

    if (!Array.isArray(orders)) {
      throw new BadRequestError('Orders must be an array');
    }

    await Category.reorder(orders);

    res.json({
      success: true,
      message: 'Categories reordered successfully',
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// MENU ITEM CONTROLLERS
// =============================================

/**
 * Get all menu items
 * GET /api/menu/items
 */
const getMenuItems = async (req, res, next) => {
  try {
    const { categoryId, dietType, availableOnly, includeVariants, limit, offset } = req.query;

    const items = await MenuItem.findAll({
      categoryId,
      dietType,
      availableOnly: availableOnly !== 'false',
      includeVariants: includeVariants === 'true',
      limit: parseInt(limit, 10) || 100,
      offset: parseInt(offset, 10) || 0,
    });

    res.json({
      success: true,
      data: { items, count: items.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get menu items by category
 * GET /api/menu/categories/:categoryId/items
 */
const getItemsByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const items = await MenuItem.findByCategory(categoryId);

    res.json({
      success: true,
      data: { category, items },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single menu item
 * GET /api/menu/items/:id
 */
const getMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findById(id, true);

    if (!item) {
      throw new NotFoundError('Menu item not found');
    }

    // Also get available addons
    const addons = await Addon.findForMenuItem(id);

    res.json({
      success: true,
      data: { item, availableAddons: addons },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create menu item
 * POST /api/menu/items
 */
const createMenuItem = async (req, res, next) => {
  try {
    const {
      categoryId, name, description, imageUrl, dietType,
      basePrice, hasVariants, variantType,
      calories, proteinGrams, carbsGrams, fatGrams, fiberGrams,
      displayOrder, isFeatured, variants,
    } = req.body;

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Create the item
    const item = await MenuItem.create({
      categoryId, name, description, imageUrl, dietType,
      basePrice, hasVariants: hasVariants || (variants && variants.length > 0),
      variantType,
      calories, proteinGrams, carbsGrams, fatGrams, fiberGrams,
      displayOrder, isFeatured,
    });

    // Create variants if provided
    if (variants && variants.length > 0) {
      item.variants = await ItemVariant.createBulk(item.id, variants);
    }

    res.status(201).json({
      success: true,
      data: { item },
      message: 'Menu item created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update menu item
 * PUT /api/menu/items/:id
 */
const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.update(id, req.body);

    if (!item) {
      throw new NotFoundError('Menu item not found');
    }

    res.json({
      success: true,
      data: { item },
      message: 'Menu item updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete menu item
 * DELETE /api/menu/items/:id
 */
const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await MenuItem.remove(id);

    if (!deleted) {
      throw new NotFoundError('Menu item not found');
    }

    res.json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle item availability
 * PATCH /api/menu/items/:id/toggle-availability
 */
const toggleItemAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.toggleAvailability(id);

    if (!item) {
      throw new NotFoundError('Menu item not found');
    }

    res.json({
      success: true,
      data: { item },
      message: `Item ${item.is_available ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search menu items
 * GET /api/menu/search
 */
const searchItems = async (req, res, next) => {
  try {
    const { q, categoryId } = req.query;

    if (!q || q.length < 2) {
      throw new BadRequestError('Search query must be at least 2 characters');
    }

    const items = await MenuItem.search(q, { categoryId });

    // Convert snake_case to camelCase for frontend
    const camelCasedItems = toCamelCase(items);

    res.json({
      success: true,
      data: { items: camelCasedItems, count: items.length },
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// VARIANT CONTROLLERS
// =============================================

/**
 * Add variant to item
 * POST /api/menu/items/:itemId/variants
 */
const addVariant = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { name, label, price, calories, proteinGrams, displayOrder } = req.body;

    // Verify item exists
    const item = await MenuItem.findById(itemId, false);
    if (!item) {
      throw new NotFoundError('Menu item not found');
    }

    const variant = await ItemVariant.create({
      menuItemId: itemId, name, label, price, calories, proteinGrams, displayOrder,
    });

    res.status(201).json({
      success: true,
      data: { variant },
      message: 'Variant added successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update variant
 * PUT /api/menu/variants/:id
 */
const updateVariant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const variant = await ItemVariant.update(id, req.body);

    if (!variant) {
      throw new NotFoundError('Variant not found');
    }

    res.json({
      success: true,
      data: { variant },
      message: 'Variant updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete variant
 * DELETE /api/menu/variants/:id
 */
const deleteVariant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await ItemVariant.remove(id);

    if (!deleted) {
      throw new NotFoundError('Variant not found');
    }

    res.json({
      success: true,
      message: 'Variant deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// ADDON CONTROLLERS
// =============================================

/**
 * Get all addons
 * GET /api/menu/addons
 */
const getAddons = async (req, res, next) => {
  try {
    const { group, availableOnly } = req.query;
    const addons = await Addon.findAll({
      group,
      availableOnly: availableOnly !== 'false',
    });

    res.json({
      success: true,
      data: { addons },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single addon
 * GET /api/menu/addons/:id
 */
const getAddon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const addon = await Addon.findById(id);

    if (!addon) {
      throw new NotFoundError('Add-on not found');
    }

    res.json({
      success: true,
      data: { addon },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create addon
 * POST /api/menu/addons
 */
const createAddon = async (req, res, next) => {
  try {
    const { name, description, price, unit, unitQuantity, calories, proteinGrams, addonGroup, displayOrder } = req.body;

    const addon = await Addon.create({
      name, description, price, unit, unitQuantity, calories, proteinGrams, addonGroup, displayOrder,
    });

    res.status(201).json({
      success: true,
      data: { addon },
      message: 'Add-on created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update addon
 * PUT /api/menu/addons/:id
 */
const updateAddon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const addon = await Addon.update(id, req.body);

    if (!addon) {
      throw new NotFoundError('Add-on not found');
    }

    res.json({
      success: true,
      data: { addon },
      message: 'Add-on updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete addon
 * DELETE /api/menu/addons/:id
 */
const deleteAddon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Addon.remove(id);

    if (!deleted) {
      throw new NotFoundError('Add-on not found');
    }

    res.json({
      success: true,
      message: 'Add-on deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Link addon to category
 * POST /api/menu/categories/:categoryId/addons
 */
const linkAddonToCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { addonId, priceOverride } = req.body;

    // Verify both exist
    const category = await Category.findById(categoryId);
    if (!category) throw new NotFoundError('Category not found');

    const addon = await Addon.findById(addonId);
    if (!addon) throw new NotFoundError('Add-on not found');

    const link = await Addon.linkToCategory(categoryId, addonId, priceOverride);

    res.status(201).json({
      success: true,
      data: { link },
      message: 'Add-on linked to category',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get addons for a category
 * GET /api/menu/categories/:categoryId/addons
 */
const getCategoryAddons = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) throw new NotFoundError('Category not found');

    const addons = await Addon.findByCategory(categoryId);

    res.json({
      success: true,
      data: { addons },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unlink addon from category
 * DELETE /api/menu/categories/:categoryId/addons/:addonId
 */
const unlinkAddonFromCategory = async (req, res, next) => {
  try {
    const { categoryId, addonId } = req.params;

    const unlinked = await Addon.unlinkFromCategory(categoryId, addonId);

    if (!unlinked) {
      throw new NotFoundError('Link not found');
    }

    res.json({
      success: true,
      message: 'Add-on unlinked from category',
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// PRICE CALCULATION
// =============================================

/**
 * Calculate price for an item with options
 * POST /api/menu/calculate-price
 */
const calculatePrice = async (req, res, next) => {
  try {
    const { menuItemId, variantId, addons } = req.body;

    const priceBreakdown = await calculateItemPrice({ menuItemId, variantId, addons });

    res.json({
      success: true,
      data: priceBreakdown,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate order total
 * POST /api/menu/calculate-order
 */
const calculateOrder = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Items array is required');
    }

    const orderTotal = await calculateOrderTotal(items);

    res.json({
      success: true,
      data: orderTotal,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================
// PUBLIC MENU (for customers)
// =============================================

/**
 * Get full menu for display
 * GET /api/menu/public
 */
const getPublicMenu = async (req, res, next) => {
  try {
    const categories = await Category.findAllWithItemCounts();

    // Get items for each category
    const menu = await Promise.all(
      categories.map(async (category) => {
        const items = await MenuItem.findByCategory(category.id);
        return {
          ...category,
          items,
        };
      })
    );

    res.json({
      success: true,
      data: { menu },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Categories
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,

  // Menu Items
  getMenuItems,
  getItemsByCategory,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  searchItems,

  // Variants
  addVariant,
  updateVariant,
  deleteVariant,

  // Addons
  getAddons,
  getAddon,
  createAddon,
  updateAddon,
  deleteAddon,
  linkAddonToCategory,
  getCategoryAddons,
  unlinkAddonFromCategory,

  // Price Calculation
  calculatePrice,
  calculateOrder,

  // Public
  getPublicMenu,
};
