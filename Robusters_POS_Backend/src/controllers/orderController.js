/**
 * Order Controller
 * Handles all order-related operations.
 */

const db = require('../database/connection');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const CustomerPackage = require('../models/CustomerPackage');
const MenuItem = require('../models/MenuItem');
const ItemVariant = require('../models/ItemVariant');
const Addon = require('../models/Addon');
const { calculateItemPriceInMem, calculateOrderTotal } = require('../utils/priceCalculator');
const { computeMealPackageCoverage, declineMealPackageCoverage } = require('../utils/mealPackageCoverage');
const { NotFoundError, BadRequestError } = require('../utils/errors');

/**
 * Resolve raw cart items into priced order-item records: batch-fetches
 * menu items/variants/addons, validates availability, and computes each
 * item's unit price (respecting a manual customUnitPrice override). Shared
 * between order creation and the meal-package coverage preview so both
 * price things exactly the same way.
 */
const resolveOrderItems = async (items) => {
  if (!items || items.length === 0) {
    throw new BadRequestError('Order must contain at least one item');
  }

  const allItemIds    = [...new Set(items.map(i => i.itemId))];
  const allVariantIds = [...new Set(items.flatMap(i => i.variantIds || []))];
  const allAddonIds   = [...new Set(items.flatMap(i => (i.addonSelections || []).map(s => s.addonId).filter(Boolean)))];

  const [menuItemsMap, variantsMap, addonsMap] = await Promise.all([
    MenuItem.findByIds(allItemIds),
    ItemVariant.findByIds(allVariantIds),
    Addon.findByIds(allAddonIds),
  ]);

  // Validate all items exist and are available before touching the DB for the order
  for (const item of items) {
    const menuItem = menuItemsMap.get(item.itemId);
    if (!menuItem) throw new NotFoundError(`Menu item ${item.itemId} not found`);
    if (!menuItem.is_available) throw new BadRequestError(`Menu item ${menuItem.name} is not available`);
  }

  const processedItems = [];

  for (const item of items) {
    const menuItem = menuItemsMap.get(item.itemId);

    let unitPrice;
    if (item.customUnitPrice !== undefined && item.customUnitPrice !== null) {
      // Number(), not parseFloat() — parseFloat silently truncates trailing
      // garbage ("100abc" -> 100), which would let a malformed value through
      // as a seemingly valid price instead of being rejected outright.
      const rawPrice = String(item.customUnitPrice).trim();
      unitPrice = rawPrice === '' ? NaN : Number(rawPrice);
      if (isNaN(unitPrice) || unitPrice < 0) {
        throw new BadRequestError(`Invalid custom price for item ${menuItem.name}`);
      }
    } else {
      const priceResult = calculateItemPriceInMem({
        itemId: item.itemId,
        variantIds: item.variantIds || [],
        addonSelections: item.addonSelections || [],
        menuItemsMap,
        variantsMap,
        addonsMap,
      });
      unitPrice = priceResult.totalPrice;
    }

    processedItems.push({
      itemId: item.itemId,
      itemName: menuItem.name,
      categoryId: menuItem.category_id,
      quantity: item.quantity,
      unitPrice,
      variantIds: item.variantIds,
      addonSelections: item.addonSelections,
      specialInstructions: item.specialInstructions,
    });
  }

  return processedItems;
};

/**
 * Create a new order
 * POST /api/orders
 */
const createOrder = async (req, res, next) => {
  try {
    const { customerId, customerPhone, customerName, customerEmail, items, paymentMethod, notes, locationId, loyaltyPointsToRedeem: rawLoyaltyPoints, useMealPackage } = req.body;
    const createdBy = req.user.id;

    // Find or create customer if customer info provided. If the caller
    // already knows the customer's id (the checkout flow does — it's the
    // same customer the meal-package preview was computed against), resolve
    // by id rather than re-resolving by phone/email: re-resolving by phone
    // could, in a narrow race, land on a different customer record than the
    // one redemption was actually computed for if that phone number were
    // edited by a separate session in between.
    let customer = null;
    let customerResult = null;
    if (customerId) {
      customer = await Customer.findById(customerId);
      if (!customer) throw new NotFoundError('Customer not found');
      customerResult = { customer, isNew: false };
    } else if (customerPhone || customerEmail) {
      const customerData = {
        phone: customerPhone,
        email: customerEmail,
        firstName: customerName?.split(' ')[0] || 'Customer',
        lastName: customerName?.split(' ').slice(1).join(' ') || ''
      };

      customerResult = await Customer.findOrCreate(customerData);
      customer = customerResult.customer;
    }

    const processedItems = await resolveOrderItems(items);

    // Automatically redeem cart items against the customer's active meal
    // package, if any — covered units are billed at ₹0, only the remainder
    // is charged. A no-op (coverage.applied === false) for the common case
    // of no customer, no package, an expired/exhausted one, or a cart that
    // doesn't match what the package allows.
    let coverage = await computeMealPackageCoverage(
      customer?.id,
      processedItems.map((pi) => ({
        itemId: pi.itemId,
        name: pi.itemName,
        variantIds: pi.variantIds,
        categoryId: pi.categoryId,
        quantity: pi.quantity,
        unitPrice: pi.unitPrice,
      }))
    );

    // Staff/customer can opt out of auto-redemption for this order (e.g. to
    // save the meal credit for later, or just pay for it normally instead) —
    // the checkout screen's "use meal package" toggle.
    if (useMealPackage === false) {
      coverage = declineMealPackageCoverage(coverage);
    }

    let subtotal = 0;
    processedItems.forEach((pi, idx) => {
      const coveredQty = coverage.applied ? coverage.itemResults[idx].coveredQty : 0;
      pi.packageCoveredQuantity = coveredQty;
      pi.totalPrice = (pi.quantity - coveredQty) * pi.unitPrice;
      subtotal += pi.totalPrice;
    });

    // Calculate tax (no tax)
    const tax = 0;
    const total = subtotal;

    // Validate partial loyalty redemption — against the post-package total,
    // so points can't be stacked on top of value the package already covered.
    const loyaltyPointsToRedeem = Math.floor(Math.max(0, Number(rawLoyaltyPoints) || 0));
    if (loyaltyPointsToRedeem > 0) {
      if (!customer) {
        throw new BadRequestError('Loyalty points redemption requires a linked customer');
      }
      const availablePoints = parseInt(customer.loyalty_points) || 0;
      if (loyaltyPointsToRedeem > availablePoints) {
        throw new BadRequestError(`Cannot redeem ${loyaltyPointsToRedeem} points — customer only has ${availablePoints}`);
      }
      if (loyaltyPointsToRedeem > total) {
        throw new BadRequestError('Cannot redeem more points than the order total');
      }
    }

    const orderData = {
      customerPhone,
      customerName,
      customerId: customer?.id,
      items: processedItems,
      subtotal,
      tax,
      total,
      paymentMethod,
      loyaltyPointsRedeemed: loyaltyPointsToRedeem,
      notes,
      createdBy,
      locationId,
    };

    // When redemption applies, the order and the meal-consumption record
    // must commit or roll back together — sharing one transaction client
    // prevents an order existing with no matching consumption record (or
    // the reverse) if either write fails partway through.
    let order;
    let mealPackageFallback = null;
    if (coverage.applied && coverage.creditsUsed > 0) {
      const client = await db.getClient();
      let consumptionRecord = null;
      let raceLossError = null;
      try {
        await client.query('BEGIN');

        order = await Order.create({
          ...orderData,
          customerPackageId: coverage.package.id,
          mealsConsumed: coverage.creditsUsed,
          isPackageOrder: true,
        }, client);

        consumptionRecord = await CustomerPackage.recordConsumption({
          customerPackageId: coverage.package.id,
          orderId: order.id,
          mealsConsumed: coverage.creditsUsed,
          orderTotal: coverage.totalCoveredValue,
          orderItems: coverage.itemResults.filter((r) => r.coveredQty > 0),
        }, client);

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        // The package became inactive or ran out of meals between our
        // optimistic coverage check and the row lock (e.g. a concurrent
        // order just used the last credit). The cart itself is still
        // perfectly orderable — fall back to a full-price order instead of
        // losing the order entirely.
        if (error instanceof BadRequestError) {
          raceLossError = error;
        } else {
          throw error;
        }
      } finally {
        client.release();
      }

      if (raceLossError) {
        coverage.applied = false;
        mealPackageFallback = { reason: raceLossError.message };
        processedItems.forEach((pi) => {
          pi.packageCoveredQuantity = 0;
          pi.totalPrice = pi.quantity * pi.unitPrice;
        });
        subtotal = processedItems.reduce((sum, pi) => sum + pi.totalPrice, 0);
        orderData.total = subtotal;
        orderData.subtotal = subtotal;
        order = await Order.create(orderData);
      } else {
        // Report the true post-commit balance, not the pre-lock snapshot —
        // under concurrent consumption the snapshot can be stale.
        coverage.package.remainingMeals = consumptionRecord.package.remaining_meals;
      }
    } else {
      order = await Order.create(orderData);
    }

    // Link order to customer and update stats if customer exists
    if (customer) {
      await Customer.linkOrder(customer.id, order.id);
      await Customer.updateStats(customer.id, order.total);

      // Deduct redeemed loyalty points
      if (loyaltyPointsToRedeem > 0) {
        await Customer.deductLoyaltyPoints(customer.id, loyaltyPointsToRedeem);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        order: {
          ...order,
          mealPackageRedemption: coverage.applied
            ? {
                packageId: coverage.package.id,
                packageName: coverage.package.name,
                mealsUsed: coverage.creditsUsed,
                remainingMeals: coverage.package.remainingMeals,
                totalSaved: coverage.totalCoveredValue,
              }
            : null,
          mealPackageFallback,
        },
        customer: customer ? {
          id: customer.id,
          name: `${customer.first_name} ${customer.last_name || ''}`.trim(),
          phone: customer.phone,
          email: customer.email,
          isNew: customerResult?.isNew || false
        } : null
      },
      message: 'Order created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Preview how much of a cart would be covered by the customer's active meal
 * package, without creating anything — lets the checkout screen show
 * "Covered by Meal Package" / savings / remaining balance before the order
 * is placed. Uses the exact same pricing and matching logic createOrder
 * uses, so the preview can never promise something the real submission
 * doesn't honor.
 * POST /api/orders/meal-package-preview
 */
const previewMealPackageCoverage = async (req, res, next) => {
  try {
    const { customerId, items, useMealPackage } = req.body;

    const processedItems = await resolveOrderItems(items);

    let coverage = await computeMealPackageCoverage(
      customerId,
      processedItems.map((pi) => ({
        itemId: pi.itemId,
        name: pi.itemName,
        variantIds: pi.variantIds,
        categoryId: pi.categoryId,
        quantity: pi.quantity,
        unitPrice: pi.unitPrice,
      }))
    );

    // Reflect the checkout screen's "use meal package" toggle, if switched
    // off — same override real order creation honors, so the preview never
    // promises something the actual submission wouldn't do.
    if (useMealPackage === false) {
      coverage = declineMealPackageCoverage(coverage);
    }

    const cartTotal = processedItems.reduce((sum, pi) => sum + pi.unitPrice * pi.quantity, 0);

    res.json({
      success: true,
      data: {
        applied: coverage.applied,
        reason: coverage.reason,
        package: coverage.package,
        items: coverage.itemResults,
        cartTotal,
        totalSaved: coverage.applied ? coverage.totalCoveredValue : 0,
        finalAmount: cartTotal - (coverage.applied ? coverage.totalCoveredValue : 0),
        mealsWillBeUsed: coverage.applied ? coverage.creditsUsed : 0,
        remainingMealsAfter: coverage.applied ? coverage.package.remainingMeals - coverage.creditsUsed : null,
        wouldHaveSaved: coverage.wouldHaveSaved || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all orders with pagination and filters
 * GET /api/orders
 */
const getOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      customerPhone,
      search,
    } = req.query;

    const result = await Order.findAllWithItems({
      page: parseInt(page),
      limit: parseInt(limit),
      startDate,
      endDate,
      customerPhone,
      search,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single order by ID
 * GET /api/orders/:id
 */
const getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update payment status
 * PATCH /api/orders/:id/payment
 */
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!Object.values(Order.PAYMENT_STATUS).includes(paymentStatus)) {
      throw new BadRequestError('Invalid payment status');
    }

    const order = await Order.updatePaymentStatus(id, paymentStatus);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    res.json({
      success: true,
      data: { order },
      message: 'Payment status updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order statistics
 * GET /api/orders/stats
 */
const getOrderStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await Order.getStats({ startDate, endDate });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request order cancellation
 * POST /api/orders/:id/cancel-request
 */
const requestCancellation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const managerId = req.user.id;

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestError('Cancellation reason is required');
    }

    const order = await Order.requestCancellation(id, managerId, reason.trim());

    // Create appropriate message based on payment method
    let message = 'Cancellation request submitted successfully';
    if (order.refund_info && order.refund_info.payment_method === 'LOYALTY') {
      message += `. ${order.refund_info.loyalty_points} loyalty points will be refunded upon approval.`;
    } else if (order.refund_info && order.refund_info.amount > 0) {
      message += `. ₹${order.refund_info.amount} will be refunded upon approval.`;
    }

    res.json({
      success: true,
      data: { order },
      message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve or reject order cancellation
 * POST /api/orders/:id/cancel-approve
 */
const approveCancellation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved, adminNotes = '' } = req.body;
    const adminId = req.user.id;

    if (typeof approved !== 'boolean') {
      throw new BadRequestError('Approved field must be a boolean');
    }

    const order = await Order.approveCancellation(id, adminId, approved, adminNotes);

    let message = approved 
      ? 'Order cancellation approved successfully'
      : 'Order cancellation rejected successfully';

    // Add refund information to message if approved
    if (approved && order.refund_info) {
      if (order.refund_info.payment_method === 'LOYALTY') {
        message += `. ${order.refund_info.loyalty_points_refunded} loyalty points have been refunded to the customer.`;
      } else if (order.refund_info.amount > 0) {
        message += `. ₹${order.refund_info.amount} refund has been processed.`;
      }
    }

    res.json({
      success: true,
      data: { order },
      message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending cancellation requests
 * GET /api/orders/cancellation-requests
 */
const getCancellationRequests = async (req, res, next) => {
  try {
    const requests = await Order.getCancellationRequests();

    res.json({
      success: true,
      data: { requests },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order status history
 * GET /api/orders/:id/status-history
 */
const getOrderStatusHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await Order.getOrderStatusHistory(id);

    res.json({
      success: true,
      data: { history },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  previewMealPackageCoverage,
  getOrders,
  getOrder,
  updatePaymentStatus,
  getOrderStats,
  requestCancellation,
  approveCancellation,
  getCancellationRequests,
  getOrderStatusHistory,
};