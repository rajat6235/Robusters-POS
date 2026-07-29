/**
 * Meal Package Checkout Coverage
 *
 * Shared logic for automatically redeeming cart items against a customer's
 * active meal package during the *regular* checkout flow (as opposed to the
 * dedicated meal-package-orders wizard, which always redeems the whole cart
 * against one specific package the staff already picked).
 *
 * Used both by the non-mutating preview endpoint (so the checkout screen can
 * show "Covered by Meal Package" before the order is placed) and by the
 * actual order-creation path — same function, same result, so the two can
 * never drift apart. Nothing here writes to the database; the caller
 * decides what to do with the result (display it, or apply it and record
 * consumption).
 */

const CustomerPackage = require('../models/CustomerPackage');
const MealPackage = require('../models/MealPackage');

const REASONS = {
  NO_CUSTOMER: 'no_customer',
  NO_ACTIVE_PACKAGE: 'no_active_package',
  EXPIRED: 'expired',
  EXHAUSTED: 'exhausted',
  NO_MATCHING_ITEMS: 'no_matching_items',
  DECLINED: 'declined',
};

/**
 * Match one cart item against a package's allowed items. Precedence: a rule
 * tied to one of the item's selected variants > a bare item rule (any
 * variant) > a rule on the item's category. Mirrors the same precedence
 * used in mealPackageOrderController.verifyOTPAndCreateOrder.
 */
const findMatchingRule = (item, allowedItems) => {
  const variantIds = item.variantIds || [];

  if (variantIds.length > 0) {
    const byVariant = allowedItems.find((a) => a.variant_id && variantIds.includes(a.variant_id));
    if (byVariant) return byVariant;
  }

  const byItem = allowedItems.find((a) => a.menu_item_id === item.itemId && !a.variant_id);
  if (byItem) return byItem;

  if (item.categoryId) {
    const byCategory = allowedItems.find((a) => a.category_id === item.categoryId);
    if (byCategory) return byCategory;
  }

  return null;
};

/**
 * Compute redemption coverage for one specific package against a cart.
 * One meal credit is consumed per covered unit (not per order) — a package
 * with 10 meals covers up to 10 total units across the cart, in cart order.
 *
 * A rule's max_quantity is a cap on how many units *that rule* ever covers
 * across the whole cart — not per cart line. Without tracking this across
 * lines, splitting the same item into multiple cart lines (e.g. two lines
 * of qty 1 instead of one line of qty 2) would let each line claim the cap
 * independently, covering more units than the rule allows.
 */
const matchCoverage = (items, allowedItems, remainingMeals) => {
  let creditsLeft = remainingMeals;
  let totalCoveredValue = 0;
  let totalCoveredUnits = 0;
  const coveredSoFarByRule = new Map();

  const itemResults = items.map((item) => {
    const rule = findMatchingRule(item, allowedItems);
    let coveredQty = 0;

    if (rule && creditsLeft > 0) {
      const alreadyCoveredByRule = coveredSoFarByRule.get(rule.id) || 0;
      const ruleCap = rule.max_quantity != null
        ? Math.max(0, rule.max_quantity - alreadyCoveredByRule)
        : item.quantity;
      coveredQty = Math.min(item.quantity, ruleCap, creditsLeft);
    }

    if (rule) {
      coveredSoFarByRule.set(rule.id, (coveredSoFarByRule.get(rule.id) || 0) + coveredQty);
    }

    creditsLeft -= coveredQty;
    totalCoveredUnits += coveredQty;
    totalCoveredValue += coveredQty * item.unitPrice;

    return {
      itemId: item.itemId,
      name: item.name,
      variantIds: item.variantIds || [],
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      coveredQty,
      chargedQty: item.quantity - coveredQty,
      covered: coveredQty > 0,
    };
  });

  return {
    itemResults,
    totalCoveredUnits,
    totalCoveredValue,
    creditsUsed: remainingMeals - creditsLeft,
  };
};

/**
 * Compute how much of a cart is covered by a customer's meal package(s).
 *
 * If the customer has more than one eligible package, picks whichever
 * covers the most cart value (ties broken by soonest expiry, to encourage
 * using up a lapsing package first). Only one package is ever applied to a
 * single checkout — items not covered by that package are simply charged
 * normally, even if a *different* package of theirs would have covered them.
 *
 * @param {string|null|undefined} customerId
 * @param {Array<{itemId: string, name: string, variantIds?: string[], categoryId?: string, quantity: number, unitPrice: number}>} items
 * @returns {Promise<{applied: boolean, reason: string|null, package: {id,name,remainingMeals}|null, itemResults: object[], totalCoveredValue?: number, totalCoveredUnits?: number, creditsUsed?: number}>}
 */
const computeMealPackageCoverage = async (customerId, items) => {
  if (!customerId) {
    return { applied: false, reason: REASONS.NO_CUSTOMER, package: null, itemResults: [] };
  }

  // Expiry is checked in SQL (expires_at < CURRENT_DATE) and returned as a
  // ready-made boolean — see findActiveForRedemption for why this can't be
  // done by comparing dates in JS.
  const allActive = await CustomerPackage.findActiveForRedemption(customerId);

  if (!allActive || allActive.length === 0) {
    return { applied: false, reason: REASONS.NO_ACTIVE_PACKAGE, package: null, itemResults: [] };
  }

  const nonExpired = allActive.filter((p) => !p.is_expired);
  if (nonExpired.length === 0) {
    return { applied: false, reason: REASONS.EXPIRED, package: null, itemResults: [] };
  }

  // Already sorted soonest-expiry-first by the query.
  const eligible = nonExpired.filter((p) => p.remaining_meals > 0);
  if (eligible.length === 0) {
    return { applied: false, reason: REASONS.EXHAUSTED, package: null, itemResults: [] };
  }

  let best = null;
  for (const pkg of eligible) {
    const allowedItems = await MealPackage.getAllowedItems(pkg.package_id);
    const coverage = matchCoverage(items, allowedItems, pkg.remaining_meals);
    if (coverage.totalCoveredValue > 0 && (!best || coverage.totalCoveredValue > best.coverage.totalCoveredValue)) {
      best = { pkg, coverage };
    }
  }

  if (!best) {
    return { applied: false, reason: REASONS.NO_MATCHING_ITEMS, package: null, itemResults: [] };
  }

  return {
    applied: true,
    reason: null,
    package: {
      id: best.pkg.id,
      name: best.pkg.package_name,
      remainingMeals: best.pkg.remaining_meals,
    },
    ...best.coverage,
  };
};

/**
 * Override an applied coverage result to reflect the staff/customer
 * choosing not to redeem the package for this order — used when the
 * checkout screen's "use meal package" toggle is switched off. Keeps the
 * package/would-have-saved info around (so the UI can still show what's
 * being skipped) while zeroing out the actual redemption so pricing and
 * order creation treat the cart as fully chargeable, same as if there were
 * no matching package at all. A no-op if coverage wasn't applied anyway.
 */
const declineMealPackageCoverage = (coverage) => {
  if (!coverage.applied) return coverage;

  return {
    applied: false,
    reason: REASONS.DECLINED,
    package: coverage.package,
    itemResults: coverage.itemResults.map((r) => ({
      ...r,
      coveredQty: 0,
      chargedQty: r.quantity,
      covered: false,
    })),
    totalCoveredUnits: 0,
    totalCoveredValue: 0,
    creditsUsed: 0,
    wouldHaveSaved: coverage.totalCoveredValue,
  };
};

module.exports = { computeMealPackageCoverage, matchCoverage, findMatchingRule, declineMealPackageCoverage, REASONS };
