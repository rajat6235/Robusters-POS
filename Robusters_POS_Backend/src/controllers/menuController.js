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

    // Get unique category IDs from search results
    const categoryIds = [...new Set(items.map(item => item.category_id))];

    // Load addons for each category
    const addonsByCategory = {};
    await Promise.all(
      categoryIds.map(async (catId) => {
        const addons = await Addon.findByCategory(catId);
        addonsByCategory[catId] = addons;
      })
    );

    // Attach addons to each item based on its category
    const itemsWithAddons = items.map(item => ({
      ...item,
      addons: addonsByCategory[item.category_id] || []
    }));

    // Convert snake_case to camelCase for frontend
    const camelCasedItems = toCamelCase(itemsWithAddons);

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
 *
 * Single query replaces the old 1 + 2N pattern (categories + items-per-cat + addons-per-cat).
 */
const getPublicMenu = async (req, res, next) => {
  try {
    const db = require('../database/connection');

    // One query: categories LEFT JOIN items LEFT JOIN category_addons LEFT JOIN addons
    const result = await db.query(`
      SELECT
        c.id              AS cat_id,
        c.name            AS cat_name,
        c.description     AS cat_description,
        c.image_url       AS cat_image_url,
        c.slug            AS cat_slug,
        c.display_order   AS cat_display_order,
        mi.id             AS item_id,
        mi.name           AS item_name,
        mi.description    AS item_description,
        mi.image_url      AS item_image_url,
        mi.diet_type,
        mi.base_price,
        mi.has_variants,
        mi.variant_type,
        mi.display_order  AS item_display_order,
        mi.is_featured,
        mi.slug           AS item_slug,
        iv.id             AS var_id,
        iv.name           AS var_name,
        iv.label          AS var_label,
        iv.price          AS var_price,
        iv.display_order  AS var_display_order,
        a.id              AS addon_id,
        a.name            AS addon_name,
        a.description     AS addon_description,
        a.addon_group,
        a.display_order   AS addon_display_order,
        COALESCE(ca.price_override, a.price) AS addon_price
      FROM categories c
      LEFT JOIN menu_items mi
        ON mi.category_id = c.id AND mi.is_available = true
      LEFT JOIN item_variants iv
        ON iv.menu_item_id = mi.id
      LEFT JOIN category_addons ca
        ON ca.category_id = c.id AND ca.is_active = true
      LEFT JOIN addons a
        ON a.id = ca.addon_id AND a.is_available = true
      WHERE c.is_active = true
      ORDER BY c.display_order, mi.display_order, iv.display_order, a.addon_group, a.display_order
    `);

    // Reconstruct tree in JS from the flat result set
    const catMap = new Map();
    for (const row of result.rows) {
      if (!catMap.has(row.cat_id)) {
        catMap.set(row.cat_id, {
          id: row.cat_id,
          name: row.cat_name,
          description: row.cat_description,
          imageUrl: row.cat_image_url,
          slug: row.cat_slug,
          displayOrder: row.cat_display_order,
          _itemMap: new Map(),
          _addonSet: new Map(),
        });
      }
      const cat = catMap.get(row.cat_id);

      // Collect addon for this category
      if (row.addon_id && !cat._addonSet.has(row.addon_id)) {
        cat._addonSet.set(row.addon_id, {
          id: row.addon_id,
          name: row.addon_name,
          description: row.addon_description,
          addonGroup: row.addon_group,
          displayOrder: row.addon_display_order,
          price: parseFloat(row.addon_price),
        });
      }

      if (!row.item_id) continue;
      if (!cat._itemMap.has(row.item_id)) {
        cat._itemMap.set(row.item_id, {
          id: row.item_id,
          name: row.item_name,
          description: row.item_description,
          imageUrl: row.item_image_url,
          dietType: row.diet_type,
          basePrice: parseFloat(row.base_price),
          hasVariants: row.has_variants,
          variantType: row.variant_type,
          displayOrder: row.item_display_order,
          isFeatured: row.is_featured,
          slug: row.item_slug,
          variants: [],
          _varSet: new Set(),
        });
      }
      const item = cat._itemMap.get(row.item_id);

      // Collect variant for this item
      if (row.var_id && !item._varSet.has(row.var_id)) {
        item._varSet.add(row.var_id);
        item.variants.push({
          id: row.var_id,
          name: row.var_name,
          label: row.var_label,
          price: parseFloat(row.var_price),
          displayOrder: row.var_display_order,
        });
      }
    }

    const menu = [...catMap.values()].map(cat => {
      const addons = [...cat._addonSet.values()];
      const items = [...cat._itemMap.values()].map(({ _varSet, ...item }) => ({
        ...item,
        addons,
      }));
      const { _itemMap, _addonSet, ...catData } = cat;
      return { ...catData, items };
    });

    res.json({ success: true, data: { menu } });
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
