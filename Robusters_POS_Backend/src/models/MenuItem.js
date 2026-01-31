/**
 * MenuItem Model
 * Handles database operations for menu items with variant support.
 */

const db = require('../database/connection');
const { createSlug } = require('./Category');

// Valid diet types
const DIET_TYPES = {
  VEGAN: 'VEGAN',
  VEG: 'VEG',
  EGGETARIAN: 'EGGETARIAN',
  NON_VEG: 'NON_VEG',
};

// Valid variant types
const VARIANT_TYPES = {
  SIZE: 'SIZE',           // 4oz, 6oz, 8oz
  PORTION: 'PORTION',     // Half, Full
  CARB_TYPE: 'CARB_TYPE', // Brown Rice, Quinoa
  CUSTOM: 'CUSTOM',       // Any custom variant
};

/**
 * Find all menu items with optional filters
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of menu items
 */
const findAll = async ({
  categoryId,
  dietType,
  availableOnly = true,
  includeVariants = false,
  limit = 100,
  offset = 0,
} = {}) => {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (categoryId) {
    conditions.push(`mi.category_id = $${paramIndex}`);
    values.push(categoryId);
    paramIndex++;
  }

  if (dietType) {
    conditions.push(`mi.diet_type = $${paramIndex}`);
    values.push(dietType);
    paramIndex++;
  }

  if (availableOnly) {
    conditions.push('mi.is_available = true');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT mi.*, c.name as category_name, c.slug as category_slug
    FROM menu_items mi
    JOIN categories c ON c.id = mi.category_id
    ${whereClause}
    ORDER BY mi.display_order ASC, mi.name ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  values.push(limit, offset);
  const result = await db.query(query, values);

  if (includeVariants) {
    // Fetch variants for all items
    const itemIds = result.rows.map((item) => item.id);
    if (itemIds.length > 0) {
      const variantsResult = await db.query(
        `SELECT * FROM item_variants
         WHERE menu_item_id = ANY($1)
         ORDER BY display_order ASC`,
        [itemIds]
      );

      // Group variants by item
      const variantsByItem = {};
      for (const variant of variantsResult.rows) {
        if (!variantsByItem[variant.menu_item_id]) {
          variantsByItem[variant.menu_item_id] = [];
        }
        variantsByItem[variant.menu_item_id].push(variant);
      }

      // Attach variants to items
      for (const item of result.rows) {
        item.variants = variantsByItem[item.id] || [];
      }
    }
  }

  return result.rows;
};

/**
 * Find menu item by ID
 * @param {string} id - Item UUID
 * @param {boolean} includeVariants - Include variants
 * @returns {Promise<Object|null>} Menu item or null
 */
const findById = async (id, includeVariants = true) => {
  const result = await db.query(
    `SELECT mi.*, c.name as category_name, c.slug as category_slug
     FROM menu_items mi
     JOIN categories c ON c.id = mi.category_id
     WHERE mi.id = $1`,
    [id]
  );

  const item = result.rows[0];
  if (!item) return null;

  if (includeVariants && item.has_variants) {
    const variantsResult = await db.query(
      `SELECT * FROM item_variants
       WHERE menu_item_id = $1
       ORDER BY display_order ASC`,
      [id]
    );
    item.variants = variantsResult.rows;
  } else {
    item.variants = [];
  }

  return item;
};

/**
 * Find menu item by slug within a category
 * @param {string} categoryId - Category UUID
 * @param {string} slug - Item slug
 * @returns {Promise<Object|null>} Menu item or null
 */
const findBySlug = async (categoryId, slug) => {
  const result = await db.query(
    `SELECT mi.*, c.name as category_name
     FROM menu_items mi
     JOIN categories c ON c.id = mi.category_id
     WHERE mi.category_id = $1 AND mi.slug = $2`,
    [categoryId, slug]
  );

  const item = result.rows[0];
  if (!item) return null;

  if (item.has_variants) {
    const variantsResult = await db.query(
      `SELECT * FROM item_variants
       WHERE menu_item_id = $1
       ORDER BY display_order ASC`,
      [item.id]
    );
    item.variants = variantsResult.rows;
  }

  return item;
};

/**
 * Create a new menu item
 * @param {Object} data - Item data
 * @returns {Promise<Object>} Created item
 */
const create = async ({
  categoryId,
  name,
  description,
  imageUrl,
  dietType = DIET_TYPES.VEG,
  basePrice,
  hasVariants = false,
  variantType,
  calories,
  proteinGrams,
  carbsGrams,
  fatGrams,
  fiberGrams,
  displayOrder = 0,
  isFeatured = false,
}) => {
  const slug = createSlug(name);

  const result = await db.query(
    `INSERT INTO menu_items (
      category_id, name, slug, description, image_url, diet_type,
      base_price, has_variants, variant_type,
      calories, protein_grams, carbs_grams, fat_grams, fiber_grams,
      display_order, is_featured
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      categoryId, name, slug, description, imageUrl, dietType,
      basePrice, hasVariants, variantType,
      calories, proteinGrams, carbsGrams, fatGrams, fiberGrams,
      displayOrder, isFeatured,
    ]
  );

  const item = result.rows[0];
  item.variants = [];
  return item;
};

/**
 * Update a menu item
 * @param {string} id - Item UUID
 * @param {Object} data - Update data
 * @returns {Promise<Object|null>} Updated item or null
 */
const update = async (id, data) => {
  const allowedFields = {
    name: 'name',
    description: 'description',
    imageUrl: 'image_url',
    dietType: 'diet_type',
    basePrice: 'base_price',
    hasVariants: 'has_variants',
    variantType: 'variant_type',
    calories: 'calories',
    proteinGrams: 'protein_grams',
    carbsGrams: 'carbs_grams',
    fatGrams: 'fat_grams',
    fiberGrams: 'fiber_grams',
    displayOrder: 'display_order',
    isAvailable: 'is_available',
    isFeatured: 'is_featured',
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
    `UPDATE menu_items SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

/**
 * Delete a menu item
 * @param {string} id - Item UUID
 * @returns {Promise<boolean>} True if deleted
 */
const remove = async (id) => {
  const result = await db.query(
    'DELETE FROM menu_items WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rowCount > 0;
};

/**
 * Get items by category with full details
 * @param {string} categoryId - Category UUID
 * @returns {Promise<Array>} Items with variants
 */
const findByCategory = async (categoryId) => {
  return findAll({ categoryId, includeVariants: true });
};

/**
 * Search menu items
 * @param {string} searchTerm - Search term
 * @param {Object} options - Search options
 * @param {string} options.categoryId - Optional category ID to filter by
 * @returns {Promise<Array>} Matching items
 */
const search = async (searchTerm, { categoryId } = {}) => {
  let query = `SELECT mi.*, c.name as category_name, c.slug as category_slug
     FROM menu_items mi
     JOIN categories c ON c.id = mi.category_id
     WHERE mi.is_available = true
       AND (mi.name ILIKE $1 OR mi.description ILIKE $1)`;

  const params = [`%${searchTerm}%`];

  if (categoryId) {
    query += ` AND mi.category_id = $2`;
    params.push(categoryId);
  }

  query += ` ORDER BY mi.name ASC LIMIT 50`;

  const result = await db.query(query, params);

  // Fetch variants for all items (same as findAll)
  const itemIds = result.rows.map((item) => item.id);
  if (itemIds.length > 0) {
    const variantsResult = await db.query(
      `SELECT * FROM item_variants
       WHERE menu_item_id = ANY($1)
       ORDER BY display_order ASC`,
      [itemIds]
    );

    // Group variants by item
    const variantsByItem = {};
    for (const variant of variantsResult.rows) {
      if (!variantsByItem[variant.menu_item_id]) {
        variantsByItem[variant.menu_item_id] = [];
      }
      variantsByItem[variant.menu_item_id].push(variant);
    }

    // Attach variants to items
    for (const item of result.rows) {
      item.variants = variantsByItem[item.id] || [];
    }
  } else {
    // If no items, ensure empty variants array
    for (const item of result.rows) {
      item.variants = [];
    }
  }

  return result.rows;
};

/**
 * Get featured items
 * @returns {Promise<Array>} Featured items
 */
const findFeatured = async () => {
  return findAll({ availableOnly: true, includeVariants: true })
    .then((items) => items.filter((item) => item.is_featured));
};

/**
 * Toggle availability
 * @param {string} id - Item UUID
 * @returns {Promise<Object|null>} Updated item
 */
const toggleAvailability = async (id) => {
  const result = await db.query(
    `UPDATE menu_items
     SET is_available = NOT is_available
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  DIET_TYPES,
  VARIANT_TYPES,
  findAll,
  findById,
  findBySlug,
  create,
  update,
  remove,
  findByCategory,
  search,
  findFeatured,
  toggleAvailability,
};
