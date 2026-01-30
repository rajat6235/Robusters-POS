/**
 * Settings Model
 * Handles database operations for application settings (key-value store with JSONB values).
 */

const db = require('../database/connection');

const Settings = {
  async findAll() {
    const result = await db.query(
      'SELECT key, value, description, updated_at FROM settings ORDER BY key'
    );
    return result.rows;
  },

  async findByKey(key) {
    const result = await db.query(
      'SELECT value FROM settings WHERE key = $1',
      [key]
    );
    return result.rows[0]?.value || null;
  },

  async updateByKey(key, value) {
    const result = await db.query(
      `UPDATE settings SET value = $2, updated_at = CURRENT_TIMESTAMP
       WHERE key = $1
       RETURNING key, value, description, updated_at`,
      [key, JSON.stringify(value)]
    );
    return result.rows[0] || null;
  },

  async getLoyaltyRatio() {
    const value = await this.findByKey('loyalty_points_ratio');
    return value || { spend_amount: 10, points_earned: 1 };
  },

  async getTierThresholds() {
    const value = await this.findByKey('tier_thresholds');
    return value || { bronze: 0, silver: 2000, gold: 5000, platinum: 10000 };
  },

  async getVipThreshold() {
    const value = await this.findByKey('vip_order_threshold');
    return value || { min_orders: 10 };
  },
};

module.exports = Settings;
