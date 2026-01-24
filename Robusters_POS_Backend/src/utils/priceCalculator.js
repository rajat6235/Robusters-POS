/**
 * Price Calculator Utility
 * Handles price calculations for menu items with variants and add-ons.
 */

const MenuItem = require('../models/MenuItem');
const ItemVariant = require('../models/ItemVariant');
const Addon = require('../models/Addon');

/**
 * Calculate price for a single item with variants and add-ons
 * @param {Object} options - Calculation options
 * @param {string} options.itemId - Menu item ID
 * @param {string[]} options.variantIds - Array of variant IDs
 * @param {Object[]} options.addonSelections - Array of addon selections
 * @returns {Promise<Object>} Price breakdown
 */
const calculateItemPrice = async ({ itemId, variantIds = [], addonSelections = [] }) => {
  // Get menu item
  const menuItem = await MenuItem.findById(itemId);
  if (!menuItem) {
    throw new Error('Menu item not found');
  }

  let basePrice = parseFloat(menuItem.base_price) || 0;
  let variantPrice = 0;
  let addonPrice = 0;

  const breakdown = {
    item: {
      name: menuItem.name,
      price: basePrice,
    },
    variants: [],
    addons: [],
  };

  // Calculate variant prices
  if (variantIds.length > 0) {
    for (const variantId of variantIds) {
      const variant = await ItemVariant.findById(variantId);
      if (variant && variant.menu_item_id === itemId) {
        const price = parseFloat(variant.price) || 0;
        variantPrice += price;
        breakdown.variants.push({
          name: variant.name,
          price: price,
        });
      }
    }
  }

  // Calculate addon prices
  if (addonSelections.length > 0) {
    for (const selection of addonSelections) {
      const addon = await Addon.findById(selection.addonId);
      if (addon && addon.is_available) {
        const price = parseFloat(addon.price) || 0;
        const quantity = parseInt(selection.quantity) || 1;
        const totalAddonPrice = price * quantity;
        addonPrice += totalAddonPrice;
        breakdown.addons.push({
          name: addon.name,
          price: price,
          quantity: quantity,
        });
      }
    }
  }

  const totalPrice = basePrice + variantPrice + addonPrice;

  return {
    basePrice,
    variantPrice,
    addonPrice,
    totalPrice,
    breakdown,
  };
};

/**
 * Calculate total for multiple items (order)
 * @param {Object[]} items - Array of order items
 * @returns {Promise<Object>} Order total breakdown
 */
const calculateOrderTotal = async (items) => {
  let subtotal = 0;
  const itemBreakdowns = [];

  for (const item of items) {
    const itemPrice = await calculateItemPrice({
      itemId: item.itemId,
      variantIds: item.variantIds || [],
      addonSelections: item.addonSelections || [],
    });

    const quantity = parseInt(item.quantity) || 1;
    const itemTotal = itemPrice.totalPrice * quantity;
    subtotal += itemTotal;

    itemBreakdowns.push({
      itemId: item.itemId,
      quantity,
      unitPrice: itemPrice.totalPrice,
      totalPrice: itemTotal,
      breakdown: itemPrice.breakdown,
    });
  }

  // Calculate tax (5% GST)
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    total,
    items: itemBreakdowns,
  };
};

module.exports = {
  calculateItemPrice,
  calculateOrderTotal,
};