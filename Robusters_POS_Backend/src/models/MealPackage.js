/**
 * Meal Package Model
 * Handles CRUD operations for meal packages
 */

const db = require('../database/connection');

/**
 * Create a new meal package
 */
const create = async ({ name, description, mealCount, price, validityDays, createdBy }) => {
  const result = await db.query(
    `INSERT INTO meal_packages (name, description, meal_count, price, validity_days, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, description, mealCount, price, validityDays, createdBy]
  );
  return result.rows[0];
};

/**
 * Find all packages with optional filters.
 * Returns a true total (COUNT(*) OVER()) alongside the page of rows.
 */
const findAll = async ({ isActive, mealCount, limit = 100, offset = 0 } = {}) => {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (isActive !== undefined) {
    conditions.push(`is_active = $${paramIndex}`);
    values.push(isActive);
    paramIndex++;
  }

  if (mealCount) {
    conditions.push(`meal_count = $${paramIndex}`);
    values.push(mealCount);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT *, COUNT(*) OVER() AS total_count
    FROM meal_packages
    ${whereClause}
    ORDER BY meal_count ASC, created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  values.push(limit, offset);
  const result = await db.query(query, values);
  const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
  const packages = result.rows.map(({ total_count, ...row }) => row);
  return { packages, total };
};

/**
 * Find package by ID
 */
const findById = async (id) => {
  const result = await db.query(
    'SELECT * FROM meal_packages WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Find package with allowed items
 */
const findByIdWithItems = async (id) => {
  const package = await findById(id);
  if (!package) return null;

  const itemsResult = await db.query(
    `SELECT
      pai.*,
      mi.name as item_name,
      iv.name as variant_name,
      c.name as category_name
    FROM package_allowed_items pai
    LEFT JOIN menu_items mi ON mi.id = pai.menu_item_id
    LEFT JOIN item_variants iv ON iv.id = pai.variant_id
    LEFT JOIN categories c ON c.id = pai.category_id
    WHERE pai.package_id = $1
    ORDER BY c.name, mi.name`,
    [id]
  );

  package.allowed_items = itemsResult.rows;
  return package;
};

/**
 * Update package
 */
const update = async (id, { name, description, mealCount, price, validityDays }) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    fields.push(`name = $${paramIndex}`);
    values.push(name);
    paramIndex++;
  }

  if (description !== undefined) {
    fields.push(`description = $${paramIndex}`);
    values.push(description);
    paramIndex++;
  }

  if (mealCount !== undefined) {
    fields.push(`meal_count = $${paramIndex}`);
    values.push(mealCount);
    paramIndex++;
  }

  if (price !== undefined) {
    fields.push(`price = $${paramIndex}`);
    values.push(price);
    paramIndex++;
  }

  if (validityDays !== undefined) {
    fields.push(`validity_days = $${paramIndex}`);
    values.push(validityDays);
    paramIndex++;
  }

  if (fields.length === 0) {
    return findById(id);
  }

  values.push(id);
  const result = await db.query(
    `UPDATE meal_packages
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

/**
 * Toggle package active status
 */
const toggleActive = async (id) => {
  const result = await db.query(
    `UPDATE meal_packages
     SET is_active = NOT is_active
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Soft delete (deactivate) package
 */
const softDelete = async (id) => {
  const result = await db.query(
    `UPDATE meal_packages
     SET is_active = false
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Hard delete a package.
 * - Nullifies package_activity_log.package_id references first (nullable FK).
 * - package_allowed_items are removed by ON DELETE CASCADE.
 * - Throws a DB error (code 23503) if customer_meal_packages rows still reference
 *   this package; the controller converts that into a ConflictError.
 */
const hardDelete = async (id) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE package_activity_log SET package_id = NULL WHERE package_id = $1',
      [id]
    );
    const result = await client.query(
      'DELETE FROM meal_packages WHERE id = $1 RETURNING id',
      [id]
    );
    await client.query('COMMIT');
    return result.rowCount > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Add allowed item to package.
 * Returns null (not a thrown error) if this exact item/variant/category was
 * already allowed — the partial unique indexes from migration 019 make this
 * a silent no-op rather than a duplicate row.
 */
const addAllowedItem = async (packageId, { menuItemId, variantId, categoryId, maxQuantity }) => {
  const result = await db.query(
    `INSERT INTO package_allowed_items (package_id, menu_item_id, variant_id, category_id, max_quantity)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [packageId, menuItemId, variantId, categoryId, maxQuantity || null]
  );
  return result.rows[0] || null;
};

/**
 * Remove allowed item from package
 */
const removeAllowedItem = async (packageId, itemId) => {
  const result = await db.query(
    `DELETE FROM package_allowed_items
     WHERE id = $1 AND package_id = $2
     RETURNING *`,
    [itemId, packageId]
  );
  return result.rowCount > 0;
};

/**
 * Get all allowed items for a package
 */
const getAllowedItems = async (packageId) => {
  const result = await db.query(
    `SELECT
      pai.*,
      mi.name as item_name,
      mi.base_price as item_price,
      iv.name as variant_name,
      iv.price as variant_price,
      c.name as category_name
    FROM package_allowed_items pai
    LEFT JOIN menu_items mi ON mi.id = pai.menu_item_id
    LEFT JOIN item_variants iv ON iv.id = pai.variant_id
    LEFT JOIN categories c ON c.id = pai.category_id
    WHERE pai.package_id = $1
    ORDER BY c.name, mi.name`,
    [packageId]
  );
  return result.rows;
};

/**
 * Bulk add items to package.
 * Single multi-row INSERT instead of one round-trip per item.
 */
const bulkAddItems = async (packageId, items) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const values = [];
    const rowPlaceholders = items.map((item, i) => {
      const base = i * 5;
      values.push(
        packageId,
        item.menuItemId || null,
        item.variantId || null,
        item.categoryId || null,
        item.maxQuantity || null
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    }).join(',\n');

    const result = await client.query(
      `INSERT INTO package_allowed_items (package_id, menu_item_id, variant_id, category_id, max_quantity)
       VALUES ${rowPlaceholders}
       ON CONFLICT DO NOTHING
       RETURNING *`,
      values
    );

    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Clear all allowed items from package
 */
const clearAllowedItems = async (packageId) => {
  const result = await db.query(
    'DELETE FROM package_allowed_items WHERE package_id = $1',
    [packageId]
  );
  return result.rowCount;
};

/**
 * Get package statistics
 */
const getStatistics = async (packageId) => {
  const result = await db.query(
    `SELECT
      COUNT(DISTINCT cmp.id) as total_assignments,
      COUNT(DISTINCT CASE WHEN cmp.status = 'active' THEN cmp.id END) as active_assignments,
      SUM(CASE WHEN cmp.status IN ('completed', 'active') THEN cmp.package_price ELSE 0 END) as total_revenue,
      SUM(CASE WHEN cmp.status = 'active' THEN cmp.remaining_meals ELSE 0 END) as total_remaining_meals
    FROM customer_meal_packages cmp
    WHERE cmp.package_id = $1`,
    [packageId]
  );
  return result.rows[0] || {};
};

module.exports = {
  create,
  findAll,
  findById,
  findByIdWithItems,
  update,
  toggleActive,
  softDelete,
  hardDelete,
  addAllowedItem,
  removeAllowedItem,
  getAllowedItems,
  bulkAddItems,
  clearAllowedItems,
  getStatistics,
};
