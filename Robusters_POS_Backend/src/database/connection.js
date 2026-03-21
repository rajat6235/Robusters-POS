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
  max: 10,
  min: 1,                          // Keep 1 warm connection, not 2 (saves resources on free tier)
  idleTimeoutMillis: 10000,        // Kill idle connections after 10s — before Neon/Render closes them (~15s)
  connectionTimeoutMillis: 10000,  // Give up acquiring a connection after 10s (retry logic handles the rest)
  acquireTimeoutMillis: 10000,
  
  // Additional cloud database optimizations
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Log pool errors (don't crash the app)
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Error codes that mean the connection is stale/dropped — safe to retry
const RETRYABLE_ERRORS = new Set([
  'ECONNRESET',       // TCP connection reset by DB server
  'ECONNREFUSED',     // DB not reachable yet (cold start)
  'EPIPE',            // Broken pipe — connection closed mid-query
  'ETIMEDOUT',        // Connection timed out
  '08006',            // PostgreSQL: connection_failure
  '08001',            // PostgreSQL: sqlclient_unable_to_establish_sqlconnection
  '57P01',            // PostgreSQL: admin_shutdown
  '08P01',            // PostgreSQL: protocol_violation (Neon proxy reset)
]);

const isRetryable = (err) =>
  RETRYABLE_ERRORS.has(err.code) ||
  /connection.*terminated|SSL SYSCALL|EOF detected|socket hang up|read ECONNRESET/i.test(err.message);

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
const query = async (text, params, attempt = 1) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (config.env === 'development') {
      console.log('Executed query', { text: text.substring(0, 50), duration: `${Date.now() - start}ms`, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    // Retry up to 2 times on stale/dropped connection errors
    if (attempt < 3 && isRetryable(err)) {
      console.warn(`DB query failed (attempt ${attempt}) — retrying: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, attempt * 200)); // 200ms, 400ms
      return query(text, params, attempt + 1);
    }
    throw err;
  }
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
