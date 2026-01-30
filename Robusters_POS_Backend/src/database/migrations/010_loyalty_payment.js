/**
 * Migration 010: Add LOYALTY to payment_method enum
 */

const addLoyaltyPayment = `
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'LOYALTY';
`;

module.exports = { addLoyaltyPayment };
