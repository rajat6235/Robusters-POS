/**
 * Application Configuration
 * Centralizes all environment variables with validation and defaults.
 * Fail-fast approach: throws error if required vars are missing in production.
 */

require('dotenv').config();

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'robusters_pos',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Bcrypt
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  },
};

// Validate required environment variables in production
if (config.env === 'production') {
  const required = ['JWT_SECRET', 'DB_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Warn in development if JWT_SECRET is not set
if (!config.jwt.secret) {
  if (config.env === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  console.warn('WARNING: JWT_SECRET not set. Using default for development only.');
  config.jwt.secret = 'dev-secret-do-not-use-in-production';
}

module.exports = config;
