/**
 * Server Entry Point
 * Starts the Express server and handles graceful shutdown.
 */

const app = require('./app');
const config = require('./config');
const db = require('./database/connection');

// Start server
const server = app.listen(config.port, async () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         ROBUSTERS POS BACKEND                              ║
╠════════════════════════════════════════════════════════════╣
║  Environment: ${config.env.padEnd(42)}║
║  Port: ${String(config.port).padEnd(49)}║
║  Database: ${config.db.name.padEnd(45)}║
╚════════════════════════════════════════════════════════════╝
  `);

  // Test database connection
  const dbConnected = await db.testConnection();
  if (!dbConnected) {
    console.warn('WARNING: Database connection failed. Some features may not work.');
  }
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed.');

    // Close database connections
    await db.closePool();

    console.log('Graceful shutdown complete.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = server;
