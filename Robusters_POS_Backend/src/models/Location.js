/**
 * Location Model
 * Handles database operations for cafe locations / branches.
 */

const db = require('../database/connection');

const Location = {
  async create({ name, address, phone }) {
    const result = await db.query(
      `INSERT INTO locations (name, address, phone)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, address || null, phone || null]
    );
    return result.rows[0];
  },

  async findAll(includeInactive = false) {
    const condition = includeInactive ? '' : 'WHERE is_active = true';
    const result = await db.query(
      `SELECT * FROM locations ${condition} ORDER BY name`
    );
    return result.rows;
  },

  async findById(id) {
    const result = await db.query(
      'SELECT * FROM locations WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async update(id, { name, address, phone }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (address !== undefined) { fields.push(`address = $${idx++}`); values.push(address); }
    if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await db.query(
      `UPDATE locations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async deactivate(id) {
    const result = await db.query(
      `UPDATE locations SET is_active = false WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = Location;
