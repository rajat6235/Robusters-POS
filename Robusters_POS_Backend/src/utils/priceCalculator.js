/**
 * Price Calculator
 * Handles price calculation for menu items with variants and add-ons.
 */

const MenuItem = require('../models/MenuItem');
const ItemVariant = require('../models/ItemVariant');
const Addon = require('../models/Addon');
const { BadRequestError } = require('./errors');

/**
 * Calculate the total price for an order item
 * @param {Object} orderItem - Order item details
 * @param {string} orderItem.menuItemId - Menu item UUID
 * @param {string} orderItem.variantId - Variant UUID (optional)
 * @param {Array} orderItem.addons - Array of {addonId, quantity}
 * @returns {Promise<Object>} Price breakdown
 */
const calculateItemPrice = async ({ menuItemId, variantId, addons = [] }) => {
  // Get the menu item
  const menuItem = await MenuItem.findById(menuItemId, true);
  if (!menuItem) {
    throw new BadRequestError('Menu item not found');
  }

  let basePrice = 0;
  let variantName = null;

  // Determine base price
  if (menuItem.has_variants) {
    if (!variantId) {
      throw new BadRequestError('Variant is required for this item');
    }

    const variant = menuItem.variants.find((v) => v.id === variantId);
    if (!variant) {
      throw new BadRequestError('Invalid variant selected');
    }

    if (!variant.is_available) {
      throw new BadRequestError('Selected variant is not available');
    }

    basePrice = parseFloat(variant.price);
    variantName = variant.name;
  } else {
    if (!menuItem.base_price) {
      throw new BadRequestError('Item has no price configured');
    }
    basePrice = parseFloat(menuItem.base_price);
  }

  // Calculate add-ons
  const addonDetails = [];
  let addonsTotal = 0;

  if (addons.length > 0) {
    // Get available addons for this item
    const availableAddons = await Addon.findForMenuItem(menuItemId);
    const addonMap = new Map(availableAddons.map((a) => [a.id, a]));

    for (const { addonId, quantity = 1 } of addons) {
      const addon = addonMap.get(addonId);

      if (!addon) {
        throw new BadRequestError(`Add-on ${addonId} is not available for this item`);
      }

      // Check max quantity
      if (addon.max_quantity && quantity > addon.max_quantity) {
        throw new BadRequestError(`Maximum quantity for ${addon.name} is ${addon.max_quantity}`);
      }

      const effectivePrice = parseFloat(addon.effective_price);
      const addonTotal = effectivePrice * quantity;

      addonDetails.push({
        addonId: addon.id,
        name: addon.name,
        unitPrice: effectivePrice,
        quantity,
        total: addonTotal,
      });

      addonsTotal += addonTotal;
    }
  }

  const totalPrice = basePrice + addonsTotal;

  return {
    menuItemId: menuItem.id,
    menuItemName: menuItem.name,
    variantId,
    variantName,
    basePrice,
    addons: addonDetails,
    addonsTotal,
    totalPrice,
  };
};

/**
 * Calculate total for multiple items (an order)
 * @param {Array} items - Array of order items
 * @returns {Promise<Object>} Order total with breakdown
 */
const calculateOrderTotal = async (items) => {
  const itemBreakdowns = [];
  let subtotal = 0;

  for (const item of items) {
    const breakdown = await calculateItemPrice(item);
    const quantity = item.quantity || 1;

    itemBreakdowns.push({
      ...breakdown,
      quantity,
      lineTotal: breakdown.totalPrice * quantity,
    });

    subtotal += breakdown.totalPrice * quantity;
  }

  return {
    items: itemBreakdowns,
    subtotal,
    // Tax and discounts can be added here later
    tax: 0,
    discount: 0,
    total: subtotal,
  };
};

/**
 * Format price for display
 * @param {number} price - Price value
 * @param {string} currency - Currency symbol
 * @returns {string} Formatted price
 */
const formatPrice = (price, currency = '₹') => {
  return `${currency}${parseFloat(price).toFixed(2)}`;
};

/**
 * Validate price is non-negative
 * @param {number} price - Price to validate
 * @param {string} fieldName - Field name for error message
 */
const validatePrice = (price, fieldName = 'Price') => {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice < 0) {
    throw new BadRequestError(`${fieldName} must be a non-negative number`);
  }
  return numPrice;
};

module.exports = {
  calculateItemPrice,
  calculateOrderTotal,
  formatPrice,
  validatePrice,
};
