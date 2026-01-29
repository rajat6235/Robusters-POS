/**
 * Database Seed Script
 * Creates initial admin user for the system.
 * Run with: npm run db:seed
 */

require('dotenv').config();
const db = require('./connection');
const User = require('../models/User');
const Location = require('../models/Location');

const DEFAULT_ADMIN = {
  email: 'admin@robusters.com',
  password: 'Admin@123', // Change this in production!
  firstName: 'System',
  lastName: 'Admin',
  role: 'ADMIN',
};

async function seed() {
  try {
    console.log('Starting database seeding...\n');

    // Test database connection
    const connected = await db.testConnection();
    if (!connected) {
      throw new Error('Cannot connect to database. Run "npm run db:init" first.');
    }

    // Check if admin user already exists
    const existingAdmin = await User.findByEmail(DEFAULT_ADMIN.email);

    if (existingAdmin) {
      console.log('Admin user already exists. Skipping seed.');
      console.log(`Email: ${DEFAULT_ADMIN.email}`);
    } else {
      // Create admin user
      const admin = await User.create(DEFAULT_ADMIN);
      console.log('Admin user created successfully!');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  DEFAULT ADMIN CREDENTIALS                                 ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log(`║  Email: ${DEFAULT_ADMIN.email.padEnd(48)}║`);
      console.log(`║  Password: ${DEFAULT_ADMIN.password.padEnd(45)}║`);
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log('║  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!       ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
    }

    // Seed default location
    const existingLocations = await Location.findAll(true);
    if (existingLocations.length === 0) {
      await Location.create({ name: 'Phase 9 Main Branch' });
      console.log('\nDefault location "Phase 9 Main Branch" created.');
    } else {
      console.log(`\nLocations already exist (${existingLocations.length}). Skipping location seed.`);
    }

    // Show summary
    const hasUsers = await User.hasAnyUser();
    console.log(`\nDatabase has users: ${hasUsers ? 'Yes' : 'No'}`);

    await db.closePool();
    console.log('\nSeeding complete!');
    process.exit(0);

  } catch (error) {
    console.error('Seeding failed:', error.message);
    await db.closePool();
    process.exit(1);
  }
}

seed();
