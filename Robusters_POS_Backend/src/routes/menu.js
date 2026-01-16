/**
 * Menu Routes
 * All menu-related API endpoints.
 */

const express = require('express');
const router = express.Router();

const menuController = require('../controllers/menuController');
const { authenticate, adminOnly, managerOrAdmin } = require('../middleware/auth');
const {
  validate,
  uuidParam,
  createCategoryRules,
  updateCategoryRules,
  reorderCategoriesRules,
  createMenuItemRules,
  updateMenuItemRules,
  createVariantRules,
  updateVariantRules,
  createAddonRules,
  updateAddonRules,
  linkAddonRules,
  calculatePriceRules,
  calculateOrderRules,
  searchRules,
} = require('../validators/menu');

// =============================================
// PUBLIC ROUTES (No auth required)
// =============================================

/**
 * @route   GET /api/menu/public
 * @desc    Get full menu for customer display
 * @access  Public
 */
router.get('/public', menuController.getPublicMenu);

/**
 * @route   GET /api/menu/search
 * @desc    Search menu items
 * @access  Public
 */
router.get('/search', searchRules, validate, menuController.searchItems);

/**
 * @route   POST /api/menu/calculate-price
 * @desc    Calculate price for an item with options
 * @access  Public
 */
router.post('/calculate-price', calculatePriceRules, validate, menuController.calculatePrice);

/**
 * @route   POST /api/menu/calculate-order
 * @desc    Calculate total for multiple items
 * @access  Public
 */
router.post('/calculate-order', calculateOrderRules, validate, menuController.calculateOrder);

// =============================================
// CATEGORY ROUTES
// =============================================

/**
 * @route   GET /api/menu/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/categories', menuController.getCategories);

/**
 * @route   GET /api/menu/categories/:id
 * @desc    Get single category
 * @access  Public
 */
router.get('/categories/:id', [uuidParam('id'), validate], menuController.getCategory);

/**
 * @route   POST /api/menu/categories
 * @desc    Create a new category
 * @access  Private (Admin)
 */
router.post(
  '/categories',
  authenticate,
  adminOnly,
  createCategoryRules,
  validate,
  menuController.createCategory
);

/**
 * @route   PUT /api/menu/categories/reorder
 * @desc    Reorder categories
 * @access  Private (Admin)
 */
router.put(
  '/categories/reorder',
  authenticate,
  adminOnly,
  reorderCategoriesRules,
  validate,
  menuController.reorderCategories
);

/**
 * @route   PUT /api/menu/categories/:id
 * @desc    Update a category
 * @access  Private (Admin)
 */
router.put(
  '/categories/:id',
  authenticate,
  adminOnly,
  updateCategoryRules,
  validate,
  menuController.updateCategory
);

/**
 * @route   DELETE /api/menu/categories/:id
 * @desc    Delete a category
 * @access  Private (Admin)
 */
router.delete(
  '/categories/:id',
  authenticate,
  adminOnly,
  [uuidParam('id'), validate],
  menuController.deleteCategory
);

/**
 * @route   GET /api/menu/categories/:categoryId/items
 * @desc    Get all items in a category
 * @access  Public
 */
router.get('/categories/:categoryId/items', [uuidParam('categoryId'), validate], menuController.getItemsByCategory);

/**
 * @route   GET /api/menu/categories/:categoryId/addons
 * @desc    Get addons available for a category
 * @access  Public
 */
router.get('/categories/:categoryId/addons', [uuidParam('categoryId'), validate], menuController.getCategoryAddons);

/**
 * @route   POST /api/menu/categories/:categoryId/addons
 * @desc    Link an addon to a category
 * @access  Private (Admin)
 */
router.post(
  '/categories/:categoryId/addons',
  authenticate,
  adminOnly,
  linkAddonRules,
  validate,
  menuController.linkAddonToCategory
);

/**
 * @route   DELETE /api/menu/categories/:categoryId/addons/:addonId
 * @desc    Unlink an addon from a category
 * @access  Private (Admin)
 */
router.delete(
  '/categories/:categoryId/addons/:addonId',
  authenticate,
  adminOnly,
  [uuidParam('categoryId'), uuidParam('addonId'), validate],
  menuController.unlinkAddonFromCategory
);

// =============================================
// MENU ITEM ROUTES
// =============================================

/**
 * @route   GET /api/menu/items
 * @desc    Get all menu items
 * @access  Public
 */
router.get('/items', menuController.getMenuItems);

/**
 * @route   GET /api/menu/items/:id
 * @desc    Get single menu item
 * @access  Public
 */
router.get('/items/:id', [uuidParam('id'), validate], menuController.getMenuItem);

/**
 * @route   POST /api/menu/items
 * @desc    Create a new menu item
 * @access  Private (Admin)
 */
router.post(
  '/items',
  authenticate,
  adminOnly,
  createMenuItemRules,
  validate,
  menuController.createMenuItem
);

/**
 * @route   PUT /api/menu/items/:id
 * @desc    Update a menu item
 * @access  Private (Admin)
 */
router.put(
  '/items/:id',
  authenticate,
  adminOnly,
  updateMenuItemRules,
  validate,
  menuController.updateMenuItem
);

/**
 * @route   DELETE /api/menu/items/:id
 * @desc    Delete a menu item
 * @access  Private (Admin)
 */
router.delete(
  '/items/:id',
  authenticate,
  adminOnly,
  [uuidParam('id'), validate],
  menuController.deleteMenuItem
);

/**
 * @route   PATCH /api/menu/items/:id/toggle-availability
 * @desc    Toggle item availability
 * @access  Private (Manager or Admin)
 */
router.patch(
  '/items/:id/toggle-availability',
  authenticate,
  managerOrAdmin,
  [uuidParam('id'), validate],
  menuController.toggleItemAvailability
);

/**
 * @route   POST /api/menu/items/:itemId/variants
 * @desc    Add a variant to a menu item
 * @access  Private (Admin)
 */
router.post(
  '/items/:itemId/variants',
  authenticate,
  adminOnly,
  createVariantRules,
  validate,
  menuController.addVariant
);

// =============================================
// VARIANT ROUTES
// =============================================

/**
 * @route   PUT /api/menu/variants/:id
 * @desc    Update a variant
 * @access  Private (Admin)
 */
router.put(
  '/variants/:id',
  authenticate,
  adminOnly,
  updateVariantRules,
  validate,
  menuController.updateVariant
);

/**
 * @route   DELETE /api/menu/variants/:id
 * @desc    Delete a variant
 * @access  Private (Admin)
 */
router.delete(
  '/variants/:id',
  authenticate,
  adminOnly,
  [uuidParam('id'), validate],
  menuController.deleteVariant
);

// =============================================
// ADDON ROUTES
// =============================================

/**
 * @route   GET /api/menu/addons
 * @desc    Get all addons
 * @access  Public
 */
router.get('/addons', menuController.getAddons);

/**
 * @route   GET /api/menu/addons/:id
 * @desc    Get single addon
 * @access  Public
 */
router.get('/addons/:id', [uuidParam('id'), validate], menuController.getAddon);

/**
 * @route   POST /api/menu/addons
 * @desc    Create a new addon
 * @access  Private (Admin)
 */
router.post(
  '/addons',
  authenticate,
  adminOnly,
  createAddonRules,
  validate,
  menuController.createAddon
);

/**
 * @route   PUT /api/menu/addons/:id
 * @desc    Update an addon
 * @access  Private (Admin)
 */
router.put(
  '/addons/:id',
  authenticate,
  adminOnly,
  updateAddonRules,
  validate,
  menuController.updateAddon
);

/**
 * @route   DELETE /api/menu/addons/:id
 * @desc    Delete an addon
 * @access  Private (Admin)
 */
router.delete(
  '/addons/:id',
  authenticate,
  adminOnly,
  [uuidParam('id'), validate],
  menuController.deleteAddon
);

module.exports = router;
