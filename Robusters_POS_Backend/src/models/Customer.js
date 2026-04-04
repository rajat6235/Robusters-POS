const db = require('../database/connection');

class Customer {
  static async create(customerData) {
    const { phone, email, firstName, lastName, dateOfBirth } = customerData;

    const result = await db.query(
      `INSERT INTO customers (phone, email, first_name, last_name, date_of_birth)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [phone, email, firstName, lastName, dateOfBirth]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT c.*, cp.dietary_restrictions, cp.allergies, cp.favorite_items, 
             cp.preferred_payment_method, cp.notes as preference_notes
      FROM customers c
      LEFT JOIN customer_preferences cp ON c.id = cp.customer_id
      WHERE c.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByPhone(phone) {
    const query = `
      SELECT c.*, cp.dietary_restrictions, cp.allergies, cp.favorite_items, 
             cp.preferred_payment_method, cp.notes as preference_notes
      FROM customers c
      LEFT JOIN customer_preferences cp ON c.id = cp.customer_id
      WHERE c.phone = $1
    `;
    
    const result = await db.query(query, [phone]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT c.*, cp.dietary_restrictions, cp.allergies, cp.favorite_items, 
             cp.preferred_payment_method, cp.notes as preference_notes
      FROM customers c
      LEFT JOIN customer_preferences cp ON c.id = cp.customer_id
      WHERE c.email = $1
    `;
    
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findOrCreate(customerData) {
    const { phone, email, firstName, lastName, dateOfBirth } = customerData;

    // Atomic upsert — eliminates the check-then-create race condition that caused
    // duplicate key errors when two concurrent requests used the same phone/email.
    if (phone) {
      const result = await db.query(
        `INSERT INTO customers (phone, email, first_name, last_name, date_of_birth)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (phone) DO NOTHING
         RETURNING *`,
        [phone, email, firstName, lastName, dateOfBirth]
      );
      if (result.rows.length > 0) {
        return { customer: result.rows[0], isNew: true };
      }
      // Already existed — fetch the current record
      const existing = await this.findByPhone(phone);
      return { customer: existing, isNew: false };
    }

    if (email) {
      const result = await db.query(
        `INSERT INTO customers (phone, email, first_name, last_name, date_of_birth)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING
         RETURNING *`,
        [phone, email, firstName, lastName, dateOfBirth]
      );
      if (result.rows.length > 0) {
        return { customer: result.rows[0], isNew: true };
      }
      const existing = await this.findByEmail(email);
      return { customer: existing, isNew: false };
    }

    // No unique identifier — just create
    const customer = await this.create(customerData);
    return { customer, isNew: true };
  }

  static async update(id, updateData) {
    const {
      phone,
      email,
      firstName,
      lastName,
      dateOfBirth
    } = updateData;

    const query = `
      UPDATE customers 
      SET phone = COALESCE($2, phone),
          email = COALESCE($3, email),
          first_name = COALESCE($4, first_name),
          last_name = COALESCE($5, last_name),
          date_of_birth = COALESCE($6, date_of_birth),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const values = [id, phone, email, firstName, lastName, dateOfBirth];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async updateStats(customerId, orderTotal) {
    // Fetch configured loyalty points ratio (lazy require to avoid circular deps)
    const Settings = require('./Settings');
    const ratio = await Settings.getLoyaltyRatio();
    const pointsToAdd = Math.floor(orderTotal / ratio.spend_amount) * ratio.points_earned;

    const query = `
      UPDATE customers
      SET total_orders = total_orders + 1,
          total_spent = total_spent + $2,
          loyalty_points = loyalty_points + $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [customerId, orderTotal, pointsToAdd]);
    return result.rows[0];
  }

  static async getAll(page = 1, limit = 20, search = '', sortBy = 'recent') {
    const offset = (page - 1) * limit;

    let query = `SELECT c.* FROM customers c WHERE true`;

    const values = [];

    if (search) {
      query += ` AND (c.first_name ILIKE $${values.length + 1}
                     OR c.last_name ILIKE $${values.length + 1}
                     OR c.phone ILIKE $${values.length + 1}
                     OR c.email ILIKE $${values.length + 1})`;
      values.push(`%${search}%`);
    }

    const sortMap = {
      loyalty: 'c.loyalty_points DESC',
      orders: 'c.total_orders DESC',
      spent: 'c.total_spent DESC',
    };
    const orderClause = sortMap[sortBy] || 'c.updated_at DESC';

    // Build count query using same search condition
    let countQuery = 'SELECT COUNT(*) FROM customers c WHERE true';
    const countValues = [];
    if (search) {
      countQuery += ` AND (c.first_name ILIKE $1 OR c.last_name ILIKE $1 OR c.phone ILIKE $1 OR c.email ILIKE $1)`;
      countValues.push(`%${search}%`);
    }

    query += ` ORDER BY ${orderClause} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    // Run data and count queries in parallel
    const [result, countResult] = await Promise.all([
      db.query(query, values),
      db.query(countQuery, countValues),
    ]);

    const total = parseInt(countResult.rows[0].count);

    return {
      customers: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getOrderHistory(customerId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    // Single CTE query replaces the old nested loops that made
    // 1 + N + N*M*2 database calls (orders + items-per-order + variants+addons-per-item).
    const sql = `
      WITH paged_orders AS (
        SELECT o.*, COUNT(*) OVER() AS total_count
        FROM orders o
        INNER JOIN customer_orders co ON o.id = co.order_id
        WHERE co.customer_id = $1
        ORDER BY o.created_at DESC
        LIMIT $2 OFFSET $3
      ),
      order_items_agg AS (
        SELECT
          oi.order_id,
          json_agg(
            json_build_object(
              'id',                   oi.id,
              'menu_item_id',         oi.menu_item_id,
              'item_name',            COALESCE(oi.item_name, mi.name, 'Deleted Item'),
              'diet_type',            mi.diet_type,
              'quantity',             oi.quantity,
              'unit_price',           oi.unit_price::float,
              'total_price',          oi.total_price::float,
              'special_instructions', oi.special_instructions,
              'variants', (
                SELECT COALESCE(json_agg(json_build_object('name', iv.name, 'price', iv.price::float)), '[]')
                FROM item_variants iv
                WHERE iv.id = ANY(
                  ARRAY(
                    SELECT jsonb_array_elements_text(v)::uuid
                    FROM (SELECT CASE
                      WHEN oi.variant_ids IS NULL OR jsonb_typeof(oi.variant_ids) <> 'array' THEN '[]'::jsonb
                      ELSE oi.variant_ids
                    END AS v) t
                  )
                )
              ),
              'addons', (
                SELECT COALESCE(json_agg(json_build_object('name', a.name, 'price', a.price::float)), '[]')
                FROM addons a
                WHERE a.id = ANY(
                  ARRAY(
                    SELECT (sel->>'addonId')::uuid
                    FROM jsonb_array_elements(
                      CASE
                        WHEN oi.addon_selections IS NULL OR jsonb_typeof(oi.addon_selections) <> 'array' THEN '[]'::jsonb
                        ELSE oi.addon_selections
                      END
                    ) AS sel
                    WHERE sel->>'addonId' IS NOT NULL
                  )
                )
              )
            )
            ORDER BY oi.created_at
          ) AS items
        FROM order_items oi
        LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.order_id IN (SELECT id FROM paged_orders)
        GROUP BY oi.order_id
      )
      SELECT po.*, COALESCE(oia.items, '[]') AS items
      FROM paged_orders po
      LEFT JOIN order_items_agg oia ON oia.order_id = po.id
      ORDER BY po.created_at DESC
    `;

    const result = await db.query(sql, [customerId, limit, offset]);

    if (result.rows.length === 0) {
      return { orders: [], pagination: { page, limit, total: 0, pages: 0 } };
    }

    const total = parseInt(result.rows[0].total_count);
    const orders = result.rows.map(({ total_count, ...order }) => ({
      ...order,
      total:    parseFloat(order.total),
      subtotal: parseFloat(order.subtotal || 0),
      tax:      parseFloat(order.tax || 0),
      items:    order.items || [],
    }));

    return {
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  static async linkOrder(customerId, orderId) {
    const query = `
      INSERT INTO customer_orders (customer_id, order_id)
      VALUES ($1, $2)
      ON CONFLICT (customer_id, order_id) DO NOTHING
      RETURNING *
    `;

    const result = await db.query(query, [customerId, orderId]);
    return result.rows[0];
  }

  static async delete(id) {
    // Hard delete — cascade removes customer_preferences and customer_orders rows automatically.
    const result = await db.query(
      `DELETE FROM customers WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  static async updatePreferences(customerId, preferences) {
    const {
      dietaryRestrictions,
      allergies,
      favoriteItems,
      preferredPaymentMethod,
      notes
    } = preferences;

    // First, try to update existing preferences
    const updateQuery = `
      UPDATE customer_preferences 
      SET dietary_restrictions = $2,
          allergies = $3,
          favorite_items = $4,
          preferred_payment_method = $5,
          notes = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = $1
      RETURNING *
    `;

    const updateValues = [
      customerId,
      dietaryRestrictions,
      allergies,
      favoriteItems,
      preferredPaymentMethod,
      notes
    ];

    let result = await db.query(updateQuery, updateValues);

    // If no rows updated, create new preferences
    if (result.rows.length === 0) {
      const insertQuery = `
        INSERT INTO customer_preferences (
          customer_id, dietary_restrictions, allergies, favorite_items, 
          preferred_payment_method, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      result = await db.query(insertQuery, updateValues);
    }

    return result.rows[0];
  }

  static async search(query, limit = 10) {
    const trimmed = query.trim();
    const likeTerm = `%${trimmed}%`;

    // Also build a phone variant (with/without leading 0) for partial phone matching
    const digitsOnly = trimmed.replace(/[^0-9]/g, '');
    let phoneVariant = null;
    if (digitsOnly.length > 0) {
      phoneVariant = digitsOnly.startsWith('0') ? digitsOnly.slice(1) : '0' + digitsOnly;
    }

    let sql = `
      SELECT c.*, cp.dietary_restrictions, cp.allergies, cp.favorite_items,
             cp.preferred_payment_method, cp.notes as preference_notes,
             CASE
               WHEN c.phone = $1 THEN 1
               ${phoneVariant ? `WHEN c.phone = $3 THEN 2` : ''}
               WHEN c.phone ILIKE $2 THEN 3
               WHEN c.first_name ILIKE $2 OR c.last_name ILIKE $2 THEN 4
               ELSE 5
             END as relevance
      FROM customers c
      LEFT JOIN customer_preferences cp ON c.id = cp.customer_id
      WHERE (
          c.phone ILIKE $2
          OR c.first_name ILIKE $2
          OR c.last_name ILIKE $2
          OR CONCAT(c.first_name, ' ', c.last_name) ILIKE $2
          ${phoneVariant ? `OR c.phone = $3 OR c.phone ILIKE $4` : ''}
        )
      ORDER BY relevance, c.first_name
    `;

    const values = [trimmed, likeTerm];
    if (phoneVariant) {
      values.push(phoneVariant, `%${phoneVariant}%`);
      sql += ` LIMIT $5`;
      values.push(limit);
    } else {
      sql += ` LIMIT $3`;
      values.push(limit);
    }

    const result = await db.query(sql, values);
    return result.rows;
  }

  static async deductLoyaltyPoints(customerId, points) {
    const query = `
      UPDATE customers
      SET loyalty_points = loyalty_points - $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND loyalty_points >= $2
      RETURNING *
    `;

    const result = await db.query(query, [customerId, points]);
    return result.rows[0];
  }

  static async getTopCustomers(limit = 10) {
    const query = `
      SELECT c.*, 
             c.total_orders,
             c.total_spent,
             c.loyalty_points
      FROM customers c
      ORDER BY c.total_spent DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    return result.rows;
  }
}

module.exports = Customer;