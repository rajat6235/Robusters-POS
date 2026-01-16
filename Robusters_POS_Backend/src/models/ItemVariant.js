/**
 * ItemVariant Model
 * Handles database operations for menu item variants.
 * Examples: 4oz/6oz/8oz sizes, Half/Full portions, Brown Rice/Quinoa options
 */

const db = require('../database/connection');

/**
 * Find all variants for a menu item
 * @param {string} menuItemId - Menu item UUID
 * @returns {Promise<Array>} Array of variants
 */
const findByMenuItem = async (menuItemId) => {
  const result = await db.query(
    `SELECT * FROM item_variants
     WHERE menu_item_id = $1
     ORDER BY display_order ASC`,
    [menuItemId]
  );
  return result.rows;
};

/**
 * Find variant by ID
 * @param {string} id - Variant UUID
 * @returns {Promise<Object|null>} Variant or null
 */
const findById = async (id) => {
  const result = await db.query(
    `SELECT iv.*, mi.name as item_name, mi.category_id
     FROM item_variants iv
     JOIN menu_items mi ON mi.id = iv.menu_item_id
     WHERE iv.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Create a new variant
 * @param {Object} data - Variant data
 * @returns {Promise<Object>} Created variant
 */
const create = async ({
  menuItemId,
  name,
  label,
  price,
  calories,
  proteinGrams,
  displayOrder = 0,
}) => {
  const result = await db.query(
    `INSERT INTO item_variants (menu_item_id, name, label, price, calories, protein_grams, display_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [menuItemId, name, label, price, calories, proteinGrams, displayOrder]
  );

  // Update the menu item to indicate it has variants
  await db.query(
    'UPDATE menu_items SET has_variants = true WHERE id = $1',
    [menuItemId]
  );

  return result.rows[0];
};

/**
 * Create multiple variants at once
 * @param {string} menuItemId - Menu item UUID
 * @param {Array} variants - Array of variant data
 * @returns {Promise<Array>} Created variants
 */
const createBulk = async (menuItemId, variants) => {
  const client = await db.getClient();
  const createdVariants = [];

  try {
    await client.query('BEGIN');

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const result = await client.query(
        `INSERT INTO item_variants (menu_item_id, name, label, price, calories, protein_grams, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [menuItemId, v.name, v.label, v.price, v.calories, v.proteinGrams, v.displayOrder || i]
      );
      createdVariants.push(result.rows[0]);
    }

    // Update menu item to indicate it has variants
    await client.query(
      'UPDATE menu_items SET has_variants = true WHERE id = $1',
      [menuItemId]
    );

    await client.query('COMMIT');
    return createdVariants;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update a variant
 * @param {string} id - Variant UUID
 * @param {Object} data - Update data
 * @returns {Promise<Object|null>} Updated variant or null
 */
const update = async (id, { name, label, price, calories, proteinGrams, displayOrder, isAvailable }) => {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    values.push(name);
    paramIndex++;
  }
  if (label !== undefined) {
    updates.push(`label = $${paramIndex}`);
    values.push(label);
    paramIndex++;
  }
  if (price !== undefined) {
    updates.push(`price = $${paramIndex}`);
    values.push(price);
    paramIndex++;
  }
  if (calories !== undefined) {
    updates.push(`calories = $${paramIndex}`);
    values.push(calories);
    paramIndex++;
  }
  if (proteinGrams !== undefined) {
    updates.push(`protein_grams = $${paramIndex}`);
    values.push(proteinGrams);
    paramIndex++;
  }
  if (displayOrder !== undefined) {
    updates.push(`display_order = $${paramIndex}`);
    values.push(displayOrder);
    paramIndex++;
  }
  if (isAvailable !== undefined) {
    updates.push(`is_available = $${paramIndex}`);
    values.push(isAvailable);
    paramIndex++;
  }

  if (updates.length === 0) {
    return findById(id);
  }

  values.push(id);

  const result = await db.query(
    `UPDATE item_variants SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

/**
 * Delete a variant
 * @param {string} id - Variant UUID
 * @returns {Promise<boolean>} True if deleted
 */
const remove = async (id) => {
  // Get the menu item ID before deleting
  const variant = await findById(id);
  if (!variant) return false;

  const result = await db.query(
    'DELETE FROM item_variants WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.rowCount > 0) {
    // Check if there are any remaining variants
    const remaining = await db.query(
      'SELECT COUNT(*) FROM item_variants WHERE menu_item_id = $1',
      [variant.menu_item_id]
    );

    // If no variants left, update the menu item
    if (parseInt(remaining.rows[0].count, 10) === 0) {
      await db.query(
        'UPDATE menu_items SET has_variants = false WHERE id = $1',
        [variant.menu_item_id]
      );
    }
  }

  return result.rowCount > 0;
};

/**
 * Delete all variants for a menu item
 * @param {string} menuItemId - Menu item UUID
 * @returns {Promise<number>} Number of deleted variants
 */
const removeAllForItem = async (menuItemId) => {
  const result = await db.query(
    'DELETE FROM item_variants WHERE menu_item_id = $1',
    [menuItemId]
  );

  // Update menu item
  await db.query(
    'UPDATE menu_items SET has_variants = false WHERE id = $1',
    [menuItemId]
  );

  return result.rowCount;
};

/**
 * Reorder variants for a menu item
 * @param {string} menuItemId - Menu item UUID
 * @param {Array} orders - Array of {id, displayOrder}
 * @returns {Promise<void>}
 */
const reorder = async (menuItemId, orders) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    for (const { id, displayOrder } of orders) {
      await client.query(
        'UPDATE item_variants SET display_order = $1 WHERE id = $2 AND menu_item_id = $3',
        [displayOrder, id, menuItemId]
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
  findByMenuItem,
  findById,
  create,
  createBulk,
  update,
  remove,
  removeAllForItem,
  reorder,
};
