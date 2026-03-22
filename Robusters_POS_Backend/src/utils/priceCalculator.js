/**
 * Price Calculator Utility
 * Handles price calculations for menu items with variants and add-ons.
 *
 * calculateItemPrice       — single item, hits DB (used for the /calculate-price endpoint)
 * calculateItemPriceInMem  — single item from pre-fetched Maps (zero DB calls, used in order creation)
 * calculateOrderTotal      — batch version: 3 DB queries total regardless of item/variant/addon count
 */

const MenuItem = require('../models/MenuItem');
const ItemVariant = require('../models/ItemVariant');
const Addon = require('../models/Addon');

// ─────────────────────────────────────────────────────────────────────────────
// In-memory price calculation (no DB calls — caller supplies pre-fetched maps)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate price for a single item using pre-fetched lookup maps.
 * @param {Object}  options
 * @param {string}  options.itemId
 * @param {string[]} options.variantIds
 * @param {Object[]} options.addonSelections
 * @param {Map}     options.menuItemsMap   — id -> menuItem row
 * @param {Map}     options.variantsMap    — id -> variant row
 * @param {Map}     options.addonsMap      — id -> addon row
 */
const calculateItemPriceInMem = ({ itemId, variantIds = [], addonSelections = [], menuItemsMap, variantsMap, addonsMap }) => {
  const menuItem = menuItemsMap.get(itemId);
  if (!menuItem) throw new Error(`Menu item ${itemId} not found`);

  let basePrice = parseFloat(menuItem.base_price) || 0;
  let variantPrice = 0;
  let addonPrice = 0;
  const breakdown = { item: { name: menuItem.name, price: basePrice }, variants: [], addons: [] };

  for (const variantId of variantIds) {
    const variant = variantsMap.get(variantId);
    if (variant && variant.menu_item_id === itemId) {
      const price = parseFloat(variant.price) || 0;
      variantPrice += price;
      breakdown.variants.push({ name: variant.name, price });
    }
  }

  for (const selection of addonSelections) {
    const addon = addonsMap.get(selection.addonId);
    if (addon && addon.is_available) {
      const price = parseFloat(addon.price) || 0;
      const quantity = parseInt(selection.quantity) || 1;
      addonPrice += price * quantity;
      breakdown.addons.push({ name: addon.name, price, quantity });
    }
  }

  const totalPrice = basePrice + variantPrice + addonPrice;
  return { basePrice, variantPrice, addonPrice, totalPrice, breakdown };
};

// ─────────────────────────────────────────────────────────────────────────────
// Single-item DB version (kept for the /calculate-price endpoint)
// ─────────────────────────────────────────────────────────────────────────────

const calculateItemPrice = async ({ itemId, variantIds = [], addonSelections = [] }) => {
  const menuItem = await MenuItem.findById(itemId);
  if (!menuItem) throw new Error('Menu item not found');

  let basePrice = parseFloat(menuItem.base_price) || 0;
  let variantPrice = 0;
  let addonPrice = 0;
  const breakdown = { item: { name: menuItem.name, price: basePrice }, variants: [], addons: [] };

  // Batch fetch variants and addons (2 queries max instead of N+M)
  const [variantsMap, addonsMap] = await Promise.all([
    ItemVariant.findByIds(variantIds),
    Addon.findByIds(addonSelections.map(s => s.addonId).filter(Boolean)),
  ]);

  for (const variantId of variantIds) {
    const variant = variantsMap.get(variantId);
    if (variant && variant.menu_item_id === itemId) {
      const price = parseFloat(variant.price) || 0;
      variantPrice += price;
      breakdown.variants.push({ name: variant.name, price });
    }
  }

  for (const selection of addonSelections) {
    const addon = addonsMap.get(selection.addonId);
    if (addon && addon.is_available) {
      const price = parseFloat(addon.price) || 0;
      const quantity = parseInt(selection.quantity) || 1;
      addonPrice += price * quantity;
      breakdown.addons.push({ name: addon.name, price, quantity });
    }
  }

  const totalPrice = basePrice + variantPrice + addonPrice;
  return { basePrice, variantPrice, addonPrice, totalPrice, breakdown };
};

// ─────────────────────────────────────────────────────────────────────────────
// Batch order total — 3 DB queries total regardless of item/variant/addon count
// ─────────────────────────────────────────────────────────────────────────────

const calculateOrderTotal = async (items) => {
  // 1. Collect all IDs
  const itemIds = [...new Set(items.map(i => i.itemId))];
  const variantIds = [...new Set(items.flatMap(i => i.variantIds || []))];
  const addonIds  = [...new Set(items.flatMap(i => (i.addonSelections || []).map(s => s.addonId).filter(Boolean)))];

  // 2. Batch fetch — 3 queries in parallel
  const [menuItemsMap, variantsMap, addonsMap] = await Promise.all([
    MenuItem.findByIds(itemIds),
    ItemVariant.findByIds(variantIds),
    Addon.findByIds(addonIds),
  ]);

  // 3. Calculate prices in-memory
  let subtotal = 0;
  const itemBreakdowns = [];

  for (const item of items) {
    const itemPrice = calculateItemPriceInMem({
      itemId: item.itemId,
      variantIds: item.variantIds || [],
      addonSelections: item.addonSelections || [],
      menuItemsMap,
      variantsMap,
      addonsMap,
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

  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  return { subtotal, tax, total, items: itemBreakdowns };
};

module.exports = {
  calculateItemPrice,
  calculateItemPriceInMem,
  calculateOrderTotal,
};
