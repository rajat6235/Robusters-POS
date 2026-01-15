/**
 * PostgreSQL Database Connection
 * Uses connection pooling for efficient connection management.
 * Pool settings optimized for typical POS workload.
 */

const { Pool } = require('pg');
const config = require('../config');

// Create connection pool with optimized settings
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,

  // Pool configuration
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail if can't connect in 5s
});

// Log pool errors (don't crash the app)
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Log when client is acquired (debug only)
if (config.env === 'development') {
  pool.on('connect', () => {
    console.log('Database client connected');
  });
}

/**
 * Execute a query with parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (config.env === 'development') {
    console.log('Executed query', { text: text.substring(0, 50), duration: `${duration}ms`, rows: result.rowCount });
  }

  return result;
};

/**
 * Get a client from the pool for transactions
 * Remember to release the client when done!
 * @returns {Promise<Object>} Pool client
 */
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connected successfully
 */
const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connected successfully at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
};

/**
 * Close all pool connections (for graceful shutdown)
 */
const closePool = async () => {
  await pool.end();
  console.log('Database pool closed');
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool,
};
