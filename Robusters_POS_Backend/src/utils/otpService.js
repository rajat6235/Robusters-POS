/**
 * OTP Service
 * Handles OTP generation, storage, verification, and SMS sending
 */

const crypto = require('crypto');

// Feature toggle: disabled until a real SMS provider is wired into sendOTP().
// Flip back to true to re-enable OTP verification for meal package orders.
const OTP_ENABLED = false;

// In-memory OTP storage (for production, use Redis)
// Structure: { phone: { otp, expiresAt, purpose, metadata } }
const otpStore = new Map();

// OTP configuration
const OTP_CONFIG = {
  length: 6,
  expiryMinutes: 5,
  maxAttempts: 3,
  resendCooldownSeconds: 60,
};

/**
 * Generate a random OTP
 * @param {number} length - OTP length
 * @returns {string} Generated OTP
 */
const generateOTP = (length = OTP_CONFIG.length) => {
  const digits = '0123456789';
  let otp = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }

  return otp;
};

/**
 * Store OTP with metadata
 * @param {string} phone - Customer phone number
 * @param {string} purpose - Purpose of OTP (e.g., 'meal_package_order')
 * @param {Object} metadata - Additional data
 * @returns {Object} OTP details
 */
const createOTP = async (phone, purpose = 'meal_package_order', metadata = {}) => {
  // Check if recent OTP exists (cooldown)
  const existing = otpStore.get(phone);
  if (existing && existing.purpose === purpose) {
    const timeSinceCreation = Date.now() - existing.createdAt;
    const cooldownMs = OTP_CONFIG.resendCooldownSeconds * 1000;

    if (timeSinceCreation < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - timeSinceCreation) / 1000);
      throw new Error(`Please wait ${remainingSeconds} seconds before requesting a new OTP`);
    }
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + (OTP_CONFIG.expiryMinutes * 60 * 1000);

  const otpData = {
    otp,
    purpose,
    metadata,
    attempts: 0,
    createdAt: Date.now(),
    expiresAt,
    verified: false,
  };

  otpStore.set(phone, otpData);

  // Auto-cleanup after expiry
  setTimeout(() => {
    const current = otpStore.get(phone);
    if (current && current.createdAt === otpData.createdAt) {
      otpStore.delete(phone);
    }
  }, OTP_CONFIG.expiryMinutes * 60 * 1000 + 10000); // Extra 10s buffer

  return {
    expiresAt,
    expiryMinutes: OTP_CONFIG.expiryMinutes,
  };
};

/**
 * Verify OTP
 * @param {string} phone - Customer phone number
 * @param {string} otp - OTP to verify
 * @param {string} purpose - Expected purpose
 * @returns {Object} Verification result with metadata
 */
const verifyOTP = async (phone, otp, purpose = 'meal_package_order') => {
  const stored = otpStore.get(phone);

  if (!stored) {
    return {
      success: false,
      message: 'No OTP found. Please request a new OTP.',
      code: 'OTP_NOT_FOUND',
    };
  }

  if (stored.purpose !== purpose) {
    return {
      success: false,
      message: 'Invalid OTP purpose.',
      code: 'INVALID_PURPOSE',
    };
  }

  if (stored.verified) {
    return {
      success: false,
      message: 'OTP already used. Please request a new OTP.',
      code: 'OTP_ALREADY_USED',
    };
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return {
      success: false,
      message: 'OTP has expired. Please request a new OTP.',
      code: 'OTP_EXPIRED',
    };
  }

  if (stored.attempts >= OTP_CONFIG.maxAttempts) {
    otpStore.delete(phone);
    return {
      success: false,
      message: 'Maximum verification attempts exceeded. Please request a new OTP.',
      code: 'MAX_ATTEMPTS_EXCEEDED',
    };
  }

  // Increment attempts
  stored.attempts += 1;

  if (stored.otp !== otp) {
    return {
      success: false,
      message: `Invalid OTP. ${OTP_CONFIG.maxAttempts - stored.attempts} attempts remaining.`,
      code: 'INVALID_OTP',
      attemptsRemaining: OTP_CONFIG.maxAttempts - stored.attempts,
    };
  }

  // OTP verified successfully
  stored.verified = true;

  const result = {
    success: true,
    message: 'OTP verified successfully',
    metadata: stored.metadata,
  };

  // Keep in store for a short time to prevent reuse, then delete
  setTimeout(() => {
    otpStore.delete(phone);
  }, 30000); // 30 seconds

  return result;
};

/**
 * Send OTP via SMS (Mock implementation)
 * In production, integrate with SMS provider (Twilio, AWS SNS, etc.)
 * @param {string} phone - Customer phone number
 * @param {string} otp - OTP to send
 * @param {string} purpose - Purpose of OTP
 * @returns {Promise<boolean>} Success status
 */
const sendOTP = async (phone, otp, purpose = 'meal_package_order') => {
  // TODO: Replace with actual SMS provider integration

  console.log('\n========================================');
  console.log('📱 SMS OTP (MOCK)');
  console.log('========================================');
  console.log(`To: ${phone}`);
  console.log(`Message: Your Robusters POS OTP is: ${otp}`);
  console.log(`Purpose: ${purpose}`);
  console.log(`Valid for: ${OTP_CONFIG.expiryMinutes} minutes`);
  console.log('========================================\n');

  // Simulate SMS sending delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // For development, always return success
  // In production, this would return the actual SMS provider response
  return true;
};

/**
 * Request OTP (Generate and Send)
 * @param {string} phone - Customer phone number
 * @param {string} purpose - Purpose of OTP
 * @param {Object} metadata - Additional data
 * @returns {Promise<Object>} OTP request result
 */
const requestOTP = async (phone, purpose = 'meal_package_order', metadata = {}) => {
  try {
    // Create OTP
    const otpDetails = await createOTP(phone, purpose, metadata);

    // Get the OTP (for sending)
    const stored = otpStore.get(phone);

    // Send OTP via SMS
    await sendOTP(phone, stored.otp, purpose);

    return {
      success: true,
      message: 'OTP sent successfully',
      expiresAt: otpDetails.expiresAt,
      expiryMinutes: otpDetails.expiryMinutes,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Clear OTP for a phone number
 * @param {string} phone - Customer phone number
 */
const clearOTP = (phone) => {
  otpStore.delete(phone);
};

/**
 * Get OTP details (for debugging/testing only)
 * @param {string} phone - Customer phone number
 * @returns {Object|null} OTP data (excluding actual OTP)
 */
const getOTPDetails = (phone) => {
  const stored = otpStore.get(phone);
  if (!stored) return null;

  return {
    purpose: stored.purpose,
    expiresAt: stored.expiresAt,
    attempts: stored.attempts,
    verified: stored.verified,
    remainingTime: Math.max(0, Math.ceil((stored.expiresAt - Date.now()) / 1000)),
  };
};

module.exports = {
  OTP_ENABLED,
  generateOTP,
  createOTP,
  verifyOTP,
  sendOTP,
  requestOTP,
  clearOTP,
  getOTPDetails,
  OTP_CONFIG,
};
