/**
 * Addon Model
 * Handles database operations for add-ons and their mappings.
 * Examples: Mixed Beans, Quinoa, Brown Rice, Egg, Dressings
 */

const db = require('../database/connection');
const { createSlug } = require('./Category');

// Addon groups for UI organization
const ADDON_GROUPS = {
  PROTEINS: 'proteins',
  CARBS: 'carbs',
  EXTRAS: 'extras',
  DRESSINGS: 'dressings',
  SALADS: 'salads',
};

/**
 * Find all addons
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of addons
 */
const findAll = async ({ group, availableOnly = true } = {}) => {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (group) {
    conditions.push(`addon_group = $${paramIndex}`);
    values.push(group);
    paramIndex++;
  }

  if (availableOnly) {
    conditions.push('is_available = true');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT * FROM addons ${whereClause} ORDER BY addon_group, display_order ASC, name ASC`,
    values
  );

  return result.rows;
};

/**
 * Find addon by ID
 * @param {string} id - Addon UUID
 * @returns {Promise<Object|null>} Addon or null
 */
const findById = async (id) => {
  const result = await db.query(
    'SELECT * FROM addons WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Find addon by slug
 * @param {string} slug - Addon slug
 * @returns {Promise<Object|null>} Addon or null
 */
const findBySlug = async (slug) => {
  const result = await db.query(
    'SELECT * FROM addons WHERE slug = $1',
    [slug]
  );
  return result.rows[0] || null;
};

/**
 * Create a new addon
 * @param {Object} data - Addon data
 * @returns {Promise<Object>} Created addon
 */
const create = async ({
  name,
  description,
  price,
  unit = 'piece',
  unitQuantity,
  calories,
  proteinGrams,
  addonGroup,
  displayOrder = 0,
}) => {
  const slug = createSlug(name);

  const result = await db.query(
    `INSERT INTO addons (name, slug, description, price, unit, unit_quantity, calories, protein_grams, addon_group, display_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [name, slug, description, price, unit, unitQuantity, calories, proteinGrams, addonGroup, displayOrder]
  );

  return result.rows[0];
};

/**
 * Update an addon
 * @param {string} id - Addon UUID
 * @param {Object} data - Update data
 * @returns {Promise<Object|null>} Updated addon or null
 */
const update = async (id, data) => {
  const allowedFields = {
    name: 'name',
    description: 'description',
    price: 'price',
    unit: 'unit',
    unitQuantity: 'unit_quantity',
    calories: 'calories',
    proteinGrams: 'protein_grams',
    addonGroup: 'addon_group',
    displayOrder: 'display_order',
    isAvailable: 'is_available',
  };

  const updates = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, column] of Object.entries(allowedFields)) {
    if (data[key] !== undefined) {
      updates.push(`${column} = $${paramIndex}`);
      values.push(data[key]);
      paramIndex++;
    }
  }

  // Update slug if name changed
  if (data.name !== undefined) {
    updates.push(`slug = $${paramIndex}`);
    values.push(createSlug(data.name));
    paramIndex++;
  }

  if (updates.length === 0) {
    return findById(id);
  }

  values.push(id);

  const result = await db.query(
    `UPDATE addons SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

/**
 * Delete an addon
 * @param {string} id - Addon UUID
 * @returns {Promise<boolean>} True if deleted
 */
const remove = async (id) => {
  const result = await db.query(
    'DELETE FROM addons WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rowCount > 0;
};

// =============================================
// CATEGORY-ADDON MAPPING
// =============================================

/**
 * Link an addon to a category
 * @param {string} categoryId - Category UUID
 * @param {string} addonId - Addon UUID
 * @param {number} priceOverride - Optional price override
 * @returns {Promise<Object>} Created mapping
 */
const linkToCategory = async (categoryId, addonId, priceOverride = null) => {
  const result = await db.query(
    `INSERT INTO category_addons (category_id, addon_id, price_override)
     VALUES ($1, $2, $3)
     ON CONFLICT (category_id, addon_id) DO UPDATE SET price_override = $3, is_active = true
     RETURNING *`,
    [categoryId, addonId, priceOverride]
  );
  return result.rows[0];
};

/**
 * Unlink an addon from a category
 * @param {string} categoryId - Category UUID
 * @param {string} addonId - Addon UUID
 * @returns {Promise<boolean>} True if unlinked
 */
const unlinkFromCategory = async (categoryId, addonId) => {
  const result = await db.query(
    'DELETE FROM category_addons WHERE category_id = $1 AND addon_id = $2',
    [categoryId, addonId]
  );
  return result.rowCount > 0;
};

/**
 * Get all addons for a category
 * @param {string} categoryId - Category UUID
 * @returns {Promise<Array>} Addons with price overrides
 */
const findByCategory = async (categoryId) => {
  const result = await db.query(
    `SELECT a.*, ca.price_override,
            COALESCE(ca.price_override, a.price) as effective_price
     FROM addons a
     JOIN category_addons ca ON ca.addon_id = a.id
     WHERE ca.category_id = $1 AND ca.is_active = true AND a.is_available = true
     ORDER BY a.addon_group, a.display_order ASC`,
    [categoryId]
  );
  return result.rows;
};

/**
 * Bulk link addons to a category
 * @param {string} categoryId - Category UUID
 * @param {Array} addonIds - Array of addon UUIDs
 * @returns {Promise<number>} Number of links created
 */
const bulkLinkToCategory = async (categoryId, addonIds) => {
  const client = await db.getClient();
  let count = 0;

  try {
    await client.query('BEGIN');

    for (const addonId of addonIds) {
      await client.query(
        `INSERT INTO category_addons (category_id, addon_id)
         VALUES ($1, $2)
         ON CONFLICT (category_id, addon_id) DO UPDATE SET is_active = true`,
        [categoryId, addonId]
      );
      count++;
    }

    await client.query('COMMIT');
    return count;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// =============================================
// ITEM-ADDON MAPPING (OVERRIDES)
// =============================================

/**
 * Set item-specific addon rule
 * @param {string} menuItemId - Menu item UUID
 * @param {string} addonId - Addon UUID
 * @param {Object} options - Override options
 * @returns {Promise<Object>} Created/updated mapping
 */
const setItemAddonRule = async (menuItemId, addonId, { priceOverride, isAllowed = true, maxQuantity } = {}) => {
  const result = await db.query(
    `INSERT INTO item_addons (menu_item_id, addon_id, price_override, is_allowed, max_quantity)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (menu_item_id, addon_id) DO UPDATE SET
       price_override = $3,
       is_allowed = $4,
       max_quantity = $5
     RETURNING *`,
    [menuItemId, addonId, priceOverride, isAllowed, maxQuantity]
  );
  return result.rows[0];
};

/**
 * Remove item-addon rule
 * @param {string} menuItemId - Menu item UUID
 * @param {string} addonId - Addon UUID
 * @returns {Promise<boolean>} True if removed
 */
const removeItemAddonRule = async (menuItemId, addonId) => {
  const result = await db.query(
    'DELETE FROM item_addons WHERE menu_item_id = $1 AND addon_id = $2',
    [menuItemId, addonId]
  );
  return result.rowCount > 0;
};

/**
 * Get available addons for a specific menu item
 * Considers both category-level and item-level rules
 * @param {string} menuItemId - Menu item UUID
 * @returns {Promise<Array>} Available addons with effective prices
 */
const findForMenuItem = async (menuItemId) => {
  const result = await db.query(
    `SELECT
       a.*,
       ca.price_override as category_price_override,
       ia.price_override as item_price_override,
       ia.is_allowed,
       ia.max_quantity,
       COALESCE(ia.price_override, ca.price_override, a.price) as effective_price
     FROM menu_items mi
     JOIN category_addons ca ON ca.category_id = mi.category_id AND ca.is_active = true
     JOIN addons a ON a.id = ca.addon_id AND a.is_available = true
     LEFT JOIN item_addons ia ON ia.menu_item_id = mi.id AND ia.addon_id = a.id
     WHERE mi.id = $1 AND COALESCE(ia.is_allowed, true) = true
     ORDER BY a.addon_group, a.display_order ASC`,
    [menuItemId]
  );
  return result.rows;
};

module.exports = {
  ADDON_GROUPS,
  findAll,
  findById,
  findBySlug,
  create,
  update,
  remove,
  linkToCategory,
  unlinkFromCategory,
  findByCategory,
  bulkLinkToCategory,
  setItemAddonRule,
  removeItemAddonRule,
  findForMenuItem,
};
