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

  // SSL configuration (required for Render and most cloud databases)
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,

  // Pool configuration - optimized for cloud databases
  max: 10, // Reduced max connections for cloud database limits
  min: 2, // Keep minimum connections alive
  idleTimeoutMillis: 20000, // Close idle connections after 20s (reduced)
  connectionTimeoutMillis: 10000, // Increased timeout for cloud latency
  acquireTimeoutMillis: 10000, // Time to wait for connection from pool
  
  // Additional cloud database optimizations
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Log pool errors (don't crash the app)
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Log when client is acquired (debug only)
if (config.env === 'development') {
  pool.on('connect', (client) => {
    console.log('Database client connected to:', config.db.host);
  });
  
  pool.on('acquire', () => {
    console.log('Client acquired from pool');
  });
  
  pool.on('remove', () => {
    console.log('Client removed from pool');
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
