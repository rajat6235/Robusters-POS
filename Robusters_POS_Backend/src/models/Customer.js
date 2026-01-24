const db = require('../database/connection');

class Customer {
  static async create(customerData) {
    const {
      phone,
      email,
      firstName,
      lastName,
      dateOfBirth
    } = customerData;

    const query = `
      INSERT INTO customers (phone, email, first_name, last_name, date_of_birth)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [phone, email, firstName, lastName, dateOfBirth];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT c.*, cp.dietary_restrictions, cp.allergies, cp.favorite_items, 
             cp.preferred_payment_method, cp.notes as preference_notes
      FROM customers c
      LEFT JOIN customer_preferences cp ON c.id = cp.customer_id
      WHERE c.id = $1 AND c.is_active = true
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
      WHERE c.phone = $1 AND c.is_active = true
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
      WHERE c.email = $1 AND c.is_active = true
    `;
    
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findOrCreate(customerData) {
    const { phone, email, firstName, lastName } = customerData;
    
    // Try to find existing customer by phone first, then email
    let customer = null;
    if (phone) {
      customer = await this.findByPhone(phone);
    }
    if (!customer && email) {
      customer = await this.findByEmail(email);
    }

    if (customer) {
      return { customer, isNew: false };
    }

    // Create new customer
    customer = await this.create(customerData);
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
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;

    const values = [id, phone, email, firstName, lastName, dateOfBirth];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async updateStats(customerId, orderTotal) {
    const query = `
      UPDATE customers 
      SET total_orders = total_orders + 1,
          total_spent = total_spent + $2,
          loyalty_points = loyalty_points + FLOOR($2 / 10),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [customerId, orderTotal]);
    return result.rows[0];
  }

  static async getAll(page = 1, limit = 20, search = '') {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT c.*, cp.dietary_restrictions, cp.allergies, cp.favorite_items, 
             cp.preferred_payment_method, cp.notes as preference_notes
      FROM customers c
      LEFT JOIN customer_preferences cp ON c.id = cp.customer_id
      WHERE c.is_active = true
    `;
    
    const values = [];
    
    if (search) {
      query += ` AND (c.first_name ILIKE $${values.length + 1} 
                     OR c.last_name ILIKE $${values.length + 1} 
                     OR c.phone ILIKE $${values.length + 1} 
                     OR c.email ILIKE $${values.length + 1})`;
      values.push(`%${search}%`);
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM customers WHERE is_active = true';
    const countValues = [];
    
    if (search) {
      countQuery += ` AND (first_name ILIKE $1 OR last_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)`;
      countValues.push(`%${search}%`);
    }

    const countResult = await db.query(countQuery, countValues);
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
    
    const query = `
      SELECT o.*, co.created_at as order_association_date
      FROM orders o
      INNER JOIN customer_orders co ON o.id = co.order_id
      WHERE co.customer_id = $1
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [customerId, limit, offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM customer_orders 
      WHERE customer_id = $1
    `;
    const countResult = await db.query(countQuery, [customerId]);
    const total = parseInt(countResult.rows[0].count);

    return {
      orders: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
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

  static async deactivate(id) {
    const query = `
      UPDATE customers 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id]);
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

  static async getTopCustomers(limit = 10) {
    const query = `
      SELECT c.*, 
             c.total_orders,
             c.total_spent,
             c.loyalty_points
      FROM customers c
      WHERE c.is_active = true
      ORDER BY c.total_spent DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    return result.rows;
  }
}

module.exports = Customer;