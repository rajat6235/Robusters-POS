/**
 * Customer Package Model
 * Handles package assignments and consumption tracking
 */

const db = require('../database/connection');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');

/**
 * Splits rows carrying a `total_count` window-function column (from
 * `COUNT(*) OVER()`) into a real total plus the page of rows, so callers
 * never have to fake pagination off `rows.length`.
 */
const unwrapCount = (rows) => {
  const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
  const packages = rows.map(({ total_count, ...row }) => row);
  return { packages, total };
};

/**
 * Same as unwrapCount, plus the total-remaining-meals sum and average
 * consumed-meals across the whole matching set (see getAllActive/findAll).
 */
const unwrapAggregates = (rows) => {
  const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
  const totalRemainingMeals = rows.length > 0 ? parseInt(rows[0].total_remaining_meals, 10) : 0;
  const avgConsumedMeals = rows.length > 0 ? Math.round(parseFloat(rows[0].avg_consumed_meals)) : 0;
  const packages = rows.map(({ total_count, total_remaining_meals, avg_consumed_meals, ...row }) => row);
  return { packages, total, totalRemainingMeals, avgConsumedMeals };
};

/**
 * Assign package to customer
 * consumedMeals parameter is used for onboarding existing offline users
 */
const assign = async ({
  customerId,
  packageId,
  totalMeals,
  consumedMeals = 0,
  packagePrice,
  amountPaid = 0,
  paymentStatus = 'pending',
  startsAt,
  expiresAt,
  assignedBy,
  notes
}) => {
  const result = await db.query(
    `INSERT INTO customer_meal_packages (
      customer_id, package_id, total_meals, consumed_meals,
      package_price, amount_paid, payment_status,
      starts_at, expires_at, assigned_by, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      customerId, packageId, totalMeals, consumedMeals,
      packagePrice, amountPaid, paymentStatus,
      startsAt, expiresAt, assignedBy, notes
    ]
  );
  return result.rows[0];
};

/**
 * Find a customer's status='active' packages for meal-package checkout
 * redemption, each annotated with an `is_expired` boolean computed in SQL
 * (`expires_at < CURRENT_DATE`) rather than in JS.
 *
 * This matters: node-pg returns a DATE column as a JS Date object, not a
 * string, so comparing it against a JS-built "today" string (e.g. via
 * `.toISOString().split('T')[0]`) silently coerces to NaN and is always
 * false — every package would look expired. Doing the comparison in
 * Postgres against CURRENT_DATE (as getExpiringPackages already does)
 * sidesteps that entirely.
 *
 * Ordered soonest-expiry-first (nulls last) so callers that want to prefer
 * "use it before it lapses" get that ordering for free.
 */
const findActiveForRedemption = async (customerId) => {
  const result = await db.query(
    `SELECT
      cmp.*,
      mp.name as package_name,
      (cmp.expires_at IS NOT NULL AND cmp.expires_at < CURRENT_DATE) AS is_expired
    FROM customer_meal_packages cmp
    JOIN meal_packages mp ON mp.id = cmp.package_id
    WHERE cmp.customer_id = $1 AND cmp.status = 'active'
    ORDER BY cmp.expires_at ASC NULLS LAST`,
    [customerId]
  );
  return result.rows;
};

/**
 * Find packages by customer
 * Returns a true total count (COUNT(*) OVER()) alongside the page of rows,
 * so callers can build real pagination instead of trusting rows.length.
 */
const findByCustomer = async (customerId, { status, limit = 50, offset = 0 } = {}) => {
  const conditions = ['cmp.customer_id = $1'];
  const values = [customerId];
  let paramIndex = 2;

  if (status) {
    conditions.push(`cmp.status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  const query = `
    SELECT
      cmp.*,
      mp.name as package_name,
      mp.description as package_description,
      mp.meal_count as package_meal_count,
      c.first_name || ' ' || c.last_name as customer_name,
      c.phone as customer_phone,
      u.first_name || ' ' || u.last_name as assigned_by_name,
      COUNT(*) OVER() AS total_count
    FROM customer_meal_packages cmp
    JOIN meal_packages mp ON mp.id = cmp.package_id
    JOIN customers c ON c.id = cmp.customer_id
    LEFT JOIN users u ON u.id = cmp.assigned_by
    WHERE ${whereClause}
    ORDER BY cmp.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  values.push(limit, offset);
  const result = await db.query(query, values);
  return unwrapCount(result.rows);
};

/**
 * Find package by ID
 */
const findById = async (id) => {
  const result = await db.query(
    `SELECT
      cmp.*,
      mp.name as package_name,
      mp.description as package_description,
      c.first_name || ' ' || c.last_name as customer_name,
      c.phone as customer_phone,
      u.first_name || ' ' || u.last_name as assigned_by_name
    FROM customer_meal_packages cmp
    JOIN meal_packages mp ON mp.id = cmp.package_id
    JOIN customers c ON c.id = cmp.customer_id
    LEFT JOIN users u ON u.id = cmp.assigned_by
    WHERE cmp.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Find package with consumption history
 */
const findByIdWithConsumption = async (id, { limit = 50, offset = 0 } = {}) => {
  const package = await findById(id);
  if (!package) return null;

  const consumptionResult = await db.query(
    `SELECT
      pmc.*,
      o.order_number,
      o.payment_method
    FROM package_meal_consumption pmc
    JOIN orders o ON o.id = pmc.order_id
    WHERE pmc.customer_package_id = $1
    ORDER BY pmc.consumed_at DESC
    LIMIT $2 OFFSET $3`,
    [id, limit, offset]
  );

  package.consumption_history = consumptionResult.rows;
  return package;
};

/**
 * Update package assignment
 */
const update = async (id, {
  totalMeals,
  consumedMeals,
  packagePrice,
  amountPaid,
  paymentStatus,
  expiresAt,
  notes
}) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (totalMeals !== undefined) {
    fields.push(`total_meals = $${paramIndex}`);
    values.push(totalMeals);
    paramIndex++;
  }

  if (consumedMeals !== undefined) {
    fields.push(`consumed_meals = $${paramIndex}`);
    values.push(consumedMeals);
    paramIndex++;
  }

  if (packagePrice !== undefined) {
    fields.push(`package_price = $${paramIndex}`);
    values.push(packagePrice);
    paramIndex++;
  }

  if (amountPaid !== undefined) {
    fields.push(`amount_paid = $${paramIndex}`);
    values.push(amountPaid);
    paramIndex++;
  }

  if (paymentStatus !== undefined) {
    fields.push(`payment_status = $${paramIndex}`);
    values.push(paymentStatus);
    paramIndex++;
  }

  if (expiresAt !== undefined) {
    fields.push(`expires_at = $${paramIndex}`);
    values.push(expiresAt);
    paramIndex++;
  }

  if (notes !== undefined) {
    fields.push(`notes = $${paramIndex}`);
    values.push(notes);
    paramIndex++;
  }

  if (fields.length === 0) {
    return findById(id);
  }

  values.push(id);
  const result = await db.query(
    `UPDATE customer_meal_packages
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

/**
 * Cancel package
 */
const cancel = async (id, { reason, cancelledBy }) => {
  const result = await db.query(
    `UPDATE customer_meal_packages
     SET status = 'cancelled',
         cancelled_at = NOW(),
         cancellation_reason = $1
     WHERE id = $2 AND status = 'active'
     RETURNING *`,
    [reason, id]
  );
  return result.rows[0] || null;
};

/**
 * Complete package (auto-triggered by trigger)
 */
const complete = async (id) => {
  const result = await db.query(
    `UPDATE customer_meal_packages
     SET status = 'completed',
         completed_at = NOW()
     WHERE id = $1 AND status = 'active'
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Record meal consumption
 *
 * Locks the customer_meal_packages row (SELECT ... FOR UPDATE) before
 * re-checking remaining meals, so two concurrent requests against the same
 * package can't both pass the "enough meals left" check — the second one
 * waits for the lock, then re-reads the post-update balance. The consumption
 * insert is also guarded by a UNIQUE(order_id) constraint (see migration
 * 017), so retrying the same order after a timeout can't double-deduct.
 *
 * @param {Object} [externalClient] - shared transaction client (see Order.create)
 */
const recordConsumption = async ({
  customerPackageId,
  orderId,
  mealsConsumed = 1,
  orderTotal,
  orderItems
}, externalClient = null) => {
  const client = externalClient || await db.getClient();
  const manageTransaction = !externalClient;

  try {
    if (manageTransaction) await client.query('BEGIN');

    const lockResult = await client.query(
      `SELECT id, total_meals, consumed_meals, status
       FROM customer_meal_packages
       WHERE id = $1
       FOR UPDATE`,
      [customerPackageId]
    );

    const pkg = lockResult.rows[0];
    if (!pkg) {
      throw new NotFoundError('Customer package not found');
    }
    if (pkg.status !== 'active') {
      throw new BadRequestError('Can only consume from active packages');
    }
    if (pkg.consumed_meals + mealsConsumed > pkg.total_meals) {
      throw new BadRequestError(
        `Insufficient meals. Only ${pkg.total_meals - pkg.consumed_meals} meal(s) remaining.`
      );
    }

    // Insert consumption record — ON CONFLICT guards against a retried
    // request for an order that already recorded consumption.
    const consumptionResult = await client.query(
      `INSERT INTO package_meal_consumption (
        customer_package_id, order_id, meals_consumed, order_total, order_items
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (order_id) DO NOTHING
      RETURNING *`,
      [customerPackageId, orderId, mealsConsumed, orderTotal, JSON.stringify(orderItems)]
    );

    if (!consumptionResult.rows[0]) {
      throw new ConflictError('A meal consumption has already been recorded for this order');
    }

    // Update consumed meals count — RETURNING the fresh balance so the
    // caller can report the true post-commit remaining meals instead of a
    // pre-lock snapshot (which can be stale under concurrent consumption).
    const updateResult = await client.query(
      `UPDATE customer_meal_packages
       SET consumed_meals = consumed_meals + $1
       WHERE id = $2
       RETURNING total_meals, consumed_meals, remaining_meals`,
      [mealsConsumed, customerPackageId]
    );

    if (manageTransaction) await client.query('COMMIT');
    return { ...consumptionResult.rows[0], package: updateResult.rows[0] };
  } catch (error) {
    if (manageTransaction) await client.query('ROLLBACK');
    throw error;
  } finally {
    if (manageTransaction) client.release();
  }
};

/**
 * Get consumption history
 */
const getConsumptionHistory = async (customerPackageId, { limit = 50, offset = 0 } = {}) => {
  const result = await db.query(
    `SELECT
      pmc.*,
      o.order_number,
      o.customer_name,
      o.payment_method,
      o.created_at as order_created_at
    FROM package_meal_consumption pmc
    JOIN orders o ON o.id = pmc.order_id
    WHERE pmc.customer_package_id = $1
    ORDER BY pmc.consumed_at DESC
    LIMIT $2 OFFSET $3`,
    [customerPackageId, limit, offset]
  );
  return result.rows;
};

/**
 * Get packages expiring soon
 */
const getExpiringPackages = async (daysThreshold = 7) => {
  const result = await db.query(
    `SELECT
      cmp.*,
      mp.name as package_name,
      c.first_name || ' ' || c.last_name as customer_name,
      c.phone as customer_phone,
      c.email as customer_email
    FROM customer_meal_packages cmp
    JOIN meal_packages mp ON mp.id = cmp.package_id
    JOIN customers c ON c.id = cmp.customer_id
    WHERE cmp.status = 'active'
      AND cmp.expires_at IS NOT NULL
      AND cmp.expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + $1
    ORDER BY cmp.expires_at ASC`,
    [daysThreshold]
  );
  return result.rows;
};

/**
 * Get active packages count for customer.
 *
 * Not currently used to cap how many active packages a customer can hold —
 * assignPackage() doesn't call this before creating a new assignment, so
 * stacking is effectively unlimited today. Left that way deliberately: a
 * customer legitimately stacking, say, a lunch package and a dinner package
 * is a plausible business case, and enforcing an arbitrary cap here isn't
 * this fix's call to make. If a max should exist, wire this into
 * assignPackage() with the actual limit as a product decision.
 */
const getActiveCount = async (customerId) => {
  const result = await db.query(
    `SELECT COUNT(*) as count
     FROM customer_meal_packages
     WHERE customer_id = $1 AND status = 'active'`,
    [customerId]
  );
  return parseInt(result.rows[0].count, 10);
};

/**
 * Get all active packages.
 * Returns a true total plus a true sum/avg across the *entire* matching set
 * (not just the current page) via window functions, so dashboard KPI tiles
 * stay correct once the result set outgrows one page.
 */
const getAllActive = async ({ limit = 100, offset = 0 } = {}) => {
  const result = await db.query(
    `SELECT
      cmp.*,
      mp.name as package_name,
      c.first_name || ' ' || c.last_name as customer_name,
      c.phone as customer_phone,
      COUNT(*) OVER() AS total_count,
      COALESCE(SUM(cmp.remaining_meals) OVER(), 0) AS total_remaining_meals,
      COALESCE(AVG(cmp.consumed_meals) OVER(), 0) AS avg_consumed_meals
    FROM customer_meal_packages cmp
    JOIN meal_packages mp ON mp.id = cmp.package_id
    JOIN customers c ON c.id = cmp.customer_id
    WHERE cmp.status = 'active'
    ORDER BY cmp.created_at DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return unwrapAggregates(result.rows);
};

/**
 * Find packages across all customers, optionally filtered by status —
 * unlike findByCustomer, this isn't scoped to one customer. Used by the
 * dashboard's "Completed" / "Expired" / "Cancelled" / "All" filters, which
 * previously fell through to getAllActive() regardless of the requested
 * status (see migration/audit note on mealPackageOrderController.getDashboard).
 */
const findAll = async ({ status, limit = 100, offset = 0 } = {}) => {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (status && status !== 'all') {
    conditions.push(`cmp.status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      cmp.*,
      mp.name as package_name,
      c.first_name || ' ' || c.last_name as customer_name,
      c.phone as customer_phone,
      COUNT(*) OVER() AS total_count,
      COALESCE(SUM(cmp.remaining_meals) OVER(), 0) AS total_remaining_meals,
      COALESCE(AVG(cmp.consumed_meals) OVER(), 0) AS avg_consumed_meals
    FROM customer_meal_packages cmp
    JOIN meal_packages mp ON mp.id = cmp.package_id
    JOIN customers c ON c.id = cmp.customer_id
    ${whereClause}
    ORDER BY cmp.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  values.push(limit, offset);
  const result = await db.query(query, values);
  return unwrapAggregates(result.rows);
};

/**
 * Bulk assign packages (for migration).
 * Single multi-row INSERT instead of one round-trip per assignment — same
 * transaction guarantee, far fewer round-trips for large batches.
 */
const bulkAssign = async (assignments) => {
  const client = await db.getClient();
  const columns = [
    'customer_id', 'package_id', 'total_meals', 'consumed_meals',
    'package_price', 'amount_paid', 'payment_status',
    'starts_at', 'expires_at', 'assigned_by', 'notes',
  ];

  try {
    await client.query('BEGIN');

    const values = [];
    const rowPlaceholders = assignments.map((assignment, i) => {
      const base = i * columns.length;
      values.push(
        assignment.customerId,
        assignment.packageId,
        assignment.totalMeals,
        assignment.consumedMeals || 0,
        assignment.packagePrice,
        assignment.amountPaid || 0,
        assignment.paymentStatus || 'pending',
        assignment.startsAt,
        assignment.expiresAt || null,
        assignment.assignedBy,
        assignment.notes || null
      );
      return `(${columns.map((_, j) => `$${base + j + 1}`).join(', ')})`;
    }).join(',\n');

    const result = await client.query(
      `INSERT INTO customer_meal_packages (${columns.join(', ')})
       VALUES ${rowPlaceholders}
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
 * Get all meal package orders across all customers (for the orders list page).
 * Optionally filter by customer phone. Returns a total_count for pagination.
 */
const getAllOrders = async ({ limit = 20, offset = 0, search } = {}) => {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (search) {
    conditions.push(`c.phone ILIKE $${paramIndex}`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      pmc.id,
      pmc.order_id,
      pmc.customer_package_id,
      pmc.meals_consumed,
      pmc.consumed_at,
      pmc.order_total,
      pmc.order_items,
      o.order_number,
      c.first_name || ' ' || c.last_name AS customer_name,
      c.phone AS customer_phone,
      mp.name AS package_name,
      COUNT(*) OVER() AS total_count
    FROM package_meal_consumption pmc
    JOIN orders o ON o.id = pmc.order_id
    JOIN customer_meal_packages cmp ON cmp.id = pmc.customer_package_id
    JOIN customers c ON c.id = cmp.customer_id
    JOIN meal_packages mp ON mp.id = cmp.package_id
    ${whereClause}
    ORDER BY pmc.consumed_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  values.push(limit, offset);
  const result = await db.query(query, values);
  const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
  const orders = result.rows.map(({ total_count, ...row }) => row);
  return { orders, total };
};

module.exports = {
  assign,
  findActiveForRedemption,
  findByCustomer,
  findById,
  findByIdWithConsumption,
  update,
  cancel,
  complete,
  recordConsumption,
  getConsumptionHistory,
  getExpiringPackages,
  getActiveCount,
  getAllActive,
  findAll,
  getAllOrders,
  bulkAssign,
};
