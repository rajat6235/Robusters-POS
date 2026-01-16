/**
 * Category Model
 * Handles database operations for menu categories.
 */

const db = require('../database/connection');

/**
 * Create a URL-friendly slug from a name
 */
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * Find all categories
 * @param {Object} options - Query options
 * @param {boolean} options.activeOnly - Only return active categories
 * @returns {Promise<Array>} Array of categories
 */
const findAll = async ({ activeOnly = true } = {}) => {
  let query = `
    SELECT id, name, slug, description, image_url, display_order, is_active, created_at, updated_at
    FROM categories
  `;

  if (activeOnly) {
    query += ' WHERE is_active = true';
  }

  query += ' ORDER BY display_order ASC, name ASC';

  const result = await db.query(query);
  return result.rows;
};

/**
 * Find category by ID
 * @param {string} id - Category UUID
 * @returns {Promise<Object|null>} Category or null
 */
const findById = async (id) => {
  const result = await db.query(
    `SELECT id, name, slug, description, image_url, display_order, is_active, created_at, updated_at
     FROM categories WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Find category by slug
 * @param {string} slug - Category slug
 * @returns {Promise<Object|null>} Category or null
 */
const findBySlug = async (slug) => {
  const result = await db.query(
    `SELECT id, name, slug, description, image_url, display_order, is_active, created_at, updated_at
     FROM categories WHERE slug = $1`,
    [slug]
  );
  return result.rows[0] || null;
};

/**
 * Create a new category
 * @param {Object} data - Category data
 * @returns {Promise<Object>} Created category
 */
const create = async ({ name, description, imageUrl, displayOrder = 0 }) => {
  const slug = createSlug(name);

  const result = await db.query(
    `INSERT INTO categories (name, slug, description, image_url, display_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, slug, description, image_url, display_order, is_active, created_at`,
    [name, slug, description, imageUrl, displayOrder]
  );

  return result.rows[0];
};

/**
 * Update a category
 * @param {string} id - Category UUID
 * @param {Object} data - Update data
 * @returns {Promise<Object|null>} Updated category or null
 */
const update = async (id, { name, description, imageUrl, displayOrder, isActive }) => {
  // Build dynamic update query
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex}`, `slug = $${paramIndex + 1}`);
    values.push(name, createSlug(name));
    paramIndex += 2;
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    values.push(description);
    paramIndex++;
  }
  if (imageUrl !== undefined) {
    updates.push(`image_url = $${paramIndex}`);
    values.push(imageUrl);
    paramIndex++;
  }
  if (displayOrder !== undefined) {
    updates.push(`display_order = $${paramIndex}`);
    values.push(displayOrder);
    paramIndex++;
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    values.push(isActive);
    paramIndex++;
  }

  if (updates.length === 0) {
    return findById(id);
  }

  values.push(id);

  const result = await db.query(
    `UPDATE categories SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, name, slug, description, image_url, display_order, is_active, created_at, updated_at`,
    values
  );

  return result.rows[0] || null;
};

/**
 * Delete a category
 * @param {string} id - Category UUID
 * @returns {Promise<boolean>} True if deleted
 */
const remove = async (id) => {
  const result = await db.query(
    'DELETE FROM categories WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rowCount > 0;
};

/**
 * Get category with item count
 * @param {string} id - Category UUID
 * @returns {Promise<Object|null>} Category with item count
 */
const findWithItemCount = async (id) => {
  const result = await db.query(
    `SELECT c.*, COUNT(mi.id) as item_count
     FROM categories c
     LEFT JOIN menu_items mi ON mi.category_id = c.id AND mi.is_available = true
     WHERE c.id = $1
     GROUP BY c.id`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Get all categories with item counts
 * @returns {Promise<Array>} Categories with item counts
 */
const findAllWithItemCounts = async () => {
  const result = await db.query(
    `SELECT c.*, COUNT(mi.id) as item_count
     FROM categories c
     LEFT JOIN menu_items mi ON mi.category_id = c.id AND mi.is_available = true
     WHERE c.is_active = true
     GROUP BY c.id
     ORDER BY c.display_order ASC, c.name ASC`
  );
  return result.rows;
};

/**
 * Reorder categories
 * @param {Array} orders - Array of {id, displayOrder}
 * @returns {Promise<void>}
 */
const reorder = async (orders) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    for (const { id, displayOrder } of orders) {
      await client.query(
        'UPDATE categories SET display_order = $1 WHERE id = $2',
        [displayOrder, id]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  findAll,
  findById,
  findBySlug,
  create,
  update,
  remove,
  findWithItemCount,
  findAllWithItemCounts,
  reorder,
  createSlug,
};
