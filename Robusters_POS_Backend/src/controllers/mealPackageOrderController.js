/**
 * Meal Package Order Controller
 * Handles OTP-verified meal package order flow
 */

const db = require('../database/connection');
const Customer = require('../models/Customer');
const CustomerPackage = require('../models/CustomerPackage');
const MealPackage = require('../models/MealPackage');
const Order = require('../models/Order');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { OTP_ENABLED, requestOTP, verifyOTP, clearOTP } = require('../utils/otpService');
const { logPackageActivity } = require('../utils/packageActivityLogger');

/**
 * Step 1: Lookup customer by phone and check meal package status
 * POST /api/meal-package-orders/lookup
 */
const lookupCustomer = async (req, res, next) => {
  try {
    const { phone } = req.body;

    // Find customer by phone
    const customer = await Customer.findByPhone(phone);

    if (!customer) {
      return res.json({
        success: true,
        data: {
          customerFound: false,
          message: 'Customer not found. You can create a fresh order.',
        },
      });
    }

    // Get active meal packages for this customer
    const { packages: activePackages } = await CustomerPackage.findByCustomer(customer.id, {
      status: 'active',
    });

    if (!activePackages || activePackages.length === 0) {
      return res.json({
        success: true,
        data: {
          customerFound: true,
          customer: {
            id: customer.id,
            name: `${customer.first_name} ${customer.last_name}`,
            phone: customer.phone,
            email: customer.email,
          },
          hasActivePackage: false,
          message: 'Customer found but has no active meal packages.',
        },
      });
    }

    // Customer has active package(s)
    const packages = activePackages.map(pkg => ({
      id: pkg.id,
      packageName: pkg.package_name,
      totalMeals: pkg.total_meals,
      consumedMeals: pkg.consumed_meals,
      remainingMeals: pkg.remaining_meals,
      expiresAt: pkg.expires_at,
      status: pkg.status,
    }));

    res.json({
      success: true,
      data: {
        customerFound: true,
        hasActivePackage: true,
        customer: {
          id: customer.id,
          name: `${customer.first_name} ${customer.last_name}`,
          phone: customer.phone,
          email: customer.email,
        },
        packages,
        message: 'Customer has active meal package(s).',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 2: Get allowed menu items for a customer's package
 * GET /api/meal-package-orders/allowed-items/:customerPackageId
 */
const getAllowedMenuItems = async (req, res, next) => {
  try {
    const { customerPackageId } = req.params;

    // Get customer package details
    const customerPackage = await CustomerPackage.findById(customerPackageId);

    if (!customerPackage) {
      throw new NotFoundError('Customer package not found');
    }

    if (customerPackage.status !== 'active') {
      throw new BadRequestError('Package is not active');
    }

    if (customerPackage.remaining_meals <= 0) {
      throw new BadRequestError('No meals remaining in this package');
    }

    // Get allowed items for this package
    const allowedItems = await MealPackage.getAllowedItems(customerPackage.package_id);

    // Group items by type
    const categorizedItems = {
      categories: [],
      menuItems: [],
      variants: [],
    };

    allowedItems.forEach(item => {
      if (item.category_id && !item.menu_item_id) {
        categorizedItems.categories.push({
          id: item.category_id,
          name: item.category_name,
          allowedItemId: item.id,
          maxQuantity: item.max_quantity,
        });
      } else if (item.menu_item_id && !item.variant_id) {
        categorizedItems.menuItems.push({
          id: item.menu_item_id,
          name: item.item_name,
          price: item.item_price,
          allowedItemId: item.id,
          maxQuantity: item.max_quantity,
        });
      } else if (item.variant_id) {
        categorizedItems.variants.push({
          id: item.variant_id,
          menuItemId: item.menu_item_id,
          name: item.variant_name,
          itemName: item.item_name,
          price: item.variant_price,
          allowedItemId: item.id,
          maxQuantity: item.max_quantity,
        });
      }
    });

    res.json({
      success: true,
      data: {
        customerPackage: {
          id: customerPackage.id,
          packageName: customerPackage.package_name,
          remainingMeals: customerPackage.remaining_meals,
        },
        allowedItems: categorizedItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 3: Request OTP for meal package order
 * POST /api/meal-package-orders/request-otp
 */
const requestOrderOTP = async (req, res, next) => {
  try {
    if (!OTP_ENABLED) {
      return res.json({
        success: true,
        message: 'OTP verification is temporarily disabled',
        data: { otpRequired: false },
      });
    }

    const { customerPackageId, orderItems } = req.body;
    const userId = req.user.id;

    // Validate customer package
    const customerPackage = await CustomerPackage.findById(customerPackageId);

    if (!customerPackage) {
      throw new NotFoundError('Customer package not found');
    }

    if (customerPackage.status !== 'active') {
      throw new BadRequestError('Package is not active');
    }

    if (customerPackage.remaining_meals <= 0) {
      throw new BadRequestError('No meals remaining in this package');
    }

    // Get customer details
    const customer = await Customer.findById(customerPackage.customer_id);

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Request OTP
    const otpResult = await requestOTP(
      customer.phone,
      'meal_package_order',
      {
        customerPackageId,
        customerId: customer.id,
        orderItems,
        requestedBy: userId,
      }
    );

    res.json({
      success: true,
      message: `OTP sent to ${customer.phone}`,
      data: {
        phone: customer.phone,
        expiresAt: otpResult.expiresAt,
        expiryMinutes: otpResult.expiryMinutes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 4: Verify OTP and create meal package order
 * POST /api/meal-package-orders/verify-and-create
 */
const verifyOTPAndCreateOrder = async (req, res, next) => {
  try {
    const {
      customerPackageId,
      otp,
      orderItems,
      mealsToConsume = 1,
      notes,
    } = req.body;
    const userId = req.user.id;

    // Get customer package
    const customerPackage = await CustomerPackage.findById(customerPackageId);

    if (!customerPackage) {
      throw new NotFoundError('Customer package not found');
    }

    if (customerPackage.status !== 'active') {
      throw new BadRequestError('Package is not active');
    }

    if (customerPackage.remaining_meals < mealsToConsume) {
      throw new BadRequestError(`Insufficient meals. Only ${customerPackage.remaining_meals} meal(s) remaining.`);
    }

    // Get customer
    const customer = await Customer.findById(customerPackage.customer_id);

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Verify OTP (skipped while OTP verification is temporarily disabled)
    if (OTP_ENABLED) {
      const otpVerification = await verifyOTP(customer.phone, otp, 'meal_package_order');

      if (!otpVerification.success) {
        return res.status(400).json({
          success: false,
          message: otpVerification.message,
          code: otpVerification.code,
          attemptsRemaining: otpVerification.attemptsRemaining,
        });
      }
    }

    // Every submitted item must actually be part of this package's allowed
    // items — otherwise a client (buggy or malicious) could submit any
    // menuItemId/variantId regardless of what's configured, making the
    // "allowed variants" restriction purely cosmetic. Precedence: a rule
    // tied to this exact variant wins, then a rule tied to the bare menu
    // item (any variant allowed), then a rule tied to the item's category.
    const allowedItems = await MealPackage.getAllowedItems(customerPackage.package_id);
    for (const item of orderItems) {
      const rule =
        (item.variantId && allowedItems.find(a => a.variant_id === item.variantId)) ||
        allowedItems.find(a => a.menu_item_id === item.menuItemId && !a.variant_id) ||
        (item.categoryId && allowedItems.find(a => a.category_id === item.categoryId));

      if (!rule) {
        throw new BadRequestError(`${item.name} is not an allowed item for this package.`);
      }

      if (rule.max_quantity != null && item.quantity > rule.max_quantity) {
        throw new BadRequestError(
          `${item.name} is limited to ${rule.max_quantity} per order (requested ${item.quantity}).`
        );
      }
    }

    // OTP verified (or disabled) - Create order.
    // Package orders don't collect additional payment, but order_items still
    // carry the real menu price of what was redeemed — that's the figure
    // reporting needs ("value redeemed via packages"), not zero.
    const mappedItems = orderItems.map((item) => {
      const unitPrice = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      return {
        itemId: item.menuItemId,
        itemName: item.name,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        variantIds: item.variantId ? [item.variantId] : [],
        addonSelections: [],
        specialInstructions: undefined,
      };
    });
    const orderTotal = mappedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // The order and its meal-consumption record must commit or roll back
    // together — sharing one transaction client prevents an order existing
    // with no matching consumption record (or the reverse) if either write
    // fails partway through.
    const client = await db.getClient();
    let order;
    let consumption;

    try {
      await client.query('BEGIN');

      order = await Order.create({
        customerName: `${customer.first_name} ${customer.last_name}`,
        customerPhone: customer.phone,
        customerId: customer.id,
        items: mappedItems,
        subtotal: orderTotal,
        tax: 0,
        total: orderTotal,
        paymentMethod: Order.PAYMENT_METHODS.PACKAGE,
        paymentStatus: Order.PAYMENT_STATUS.PAID,
        notes: notes || `Meal Package Order - ${mealsToConsume} meal(s) consumed`,
        createdBy: userId,
        customerPackageId,
        mealsConsumed: mealsToConsume,
        isPackageOrder: true,
      }, client);

      // Record consumption — locks the package row and re-checks remaining
      // meals atomically, so a concurrent request can't overrun the balance.
      consumption = await CustomerPackage.recordConsumption({
        customerPackageId,
        orderId: order.id,
        mealsConsumed: mealsToConsume,
        orderTotal,
        orderItems,
      }, client);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Log activity (only after the transaction has actually committed)
    await logPackageActivity({
      entityType: 'consumption',
      entityId: consumption.id,
      action: 'meal_consumed_otp_verified',
      performedBy: userId,
      customerId: customer.id,
      packageId: customerPackage.package_id,
      metadata: {
        orderId: order.id,
        mealsConsumed: mealsToConsume,
        otpVerified: OTP_ENABLED,
        remainingMeals: consumption.package.remaining_meals,
      },
    });

    // Clear OTP
    if (OTP_ENABLED) {
      clearOTP(customer.phone);
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: {
          id: order.id,
          orderNumber: order.order_number,
          mealsConsumed: mealsToConsume,
          remainingMeals: consumption.package.remaining_meals,
        },
        consumption,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get meal package dashboard data
 * GET /api/meal-package-orders/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const { status = 'active', search, limit = 50, offset = 0 } = req.query;

    let packages;
    let total = 0;
    let totalRemainingMeals = 0;
    let avgConsumedMeals = 0;

    if (search) {
      // Search by mobile number — scoped to one customer, so the KPI
      // aggregates below are computed from the (small) result set directly.
      const customer = await Customer.findByPhone(search);

      if (!customer) {
        return res.json({
          success: true,
          data: {
            packages: [],
            count: 0,
            totalRemainingMeals: 0,
            avgConsumedMeals: 0,
            message: 'No customer found with this phone number',
          },
        });
      }

      const result = await CustomerPackage.findByCustomer(customer.id, {
        status: status !== 'all' ? status : undefined,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });
      packages = result.packages;
      total = result.total;
      totalRemainingMeals = packages.reduce((sum, p) => sum + (p.remaining_meals || 0), 0);
      avgConsumedMeals = packages.length > 0
        ? Math.round(packages.reduce((sum, p) => sum + (p.consumed_meals || 0), 0) / packages.length)
        : 0;
    } else {
      // Status-filtered query across all customers — previously this always
      // called getAllActive() regardless of the requested status, so picking
      // "Completed"/"Expired"/"Cancelled" silently showed active packages.
      const result = await CustomerPackage.findAll({
        status,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });
      packages = result.packages;
      total = result.total;
      totalRemainingMeals = result.totalRemainingMeals;
      avgConsumedMeals = result.avgConsumedMeals;
    }

    // Enrich with last consumption data
    const enrichedPackages = await Promise.all(
      packages.map(async (pkg) => {
        const consumptionHistory = await CustomerPackage.getConsumptionHistory(pkg.id, {
          limit: 1,
          offset: 0,
        });

        return {
          id: pkg.id,
          customer: {
            name: pkg.customer_name,
            phone: pkg.customer_phone,
          },
          package: {
            name: pkg.package_name,
            totalMeals: pkg.total_meals,
            consumedMeals: pkg.consumed_meals,
            remainingMeals: pkg.remaining_meals,
          },
          status: pkg.status,
          paymentStatus: pkg.payment_status,
          startsAt: pkg.starts_at,
          expiresAt: pkg.expires_at,
          lastMealDate: consumptionHistory.length > 0 ? consumptionHistory[0].consumed_at : null,
          lastMealVerified: consumptionHistory.length > 0 ? OTP_ENABLED : false,
        };
      })
    );

    res.json({
      success: true,
      data: {
        packages: enrichedPackages,
        count: total,
        totalRemainingMeals,
        avgConsumedMeals,
        filters: {
          status,
          search: search || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed package consumption history
 * GET /api/meal-package-orders/consumption-history/:customerPackageId
 */
const getConsumptionHistory = async (req, res, next) => {
  try {
    const { customerPackageId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const customerPackage = await CustomerPackage.findById(customerPackageId);

    if (!customerPackage) {
      throw new NotFoundError('Customer package not found');
    }

    const history = await CustomerPackage.getConsumptionHistory(customerPackageId, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      success: true,
      data: {
        customerPackage: {
          id: customerPackage.id,
          customerName: customerPackage.customer_name,
          packageName: customerPackage.package_name,
          totalMeals: customerPackage.total_meals,
          consumedMeals: customerPackage.consumed_meals,
          remainingMeals: customerPackage.remaining_meals,
        },
        history: history.map(record => ({
          id: record.id,
          orderId: record.order_id,
          orderNumber: record.order_number,
          mealsConsumed: record.meals_consumed,
          consumedAt: record.consumed_at,
          orderTotal: record.order_total,
          paymentMethod: record.payment_method,
          otpVerified: OTP_ENABLED,
        })),
        count: history.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all meal package orders (consumption records) across all customers
 * GET /api/meal-package-orders/orders
 */
const getAllOrders = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, search } = req.query;

    const { orders, total } = await CustomerPackage.getAllOrders({
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      search: search || undefined,
    });

    res.json({
      success: true,
      data: {
        orders: orders.map(o => ({
          id: o.id,
          orderId: o.order_id,
          orderNumber: o.order_number,
          customerPackageId: o.customer_package_id,
          customerName: o.customer_name,
          customerPhone: o.customer_phone,
          packageName: o.package_name,
          mealsConsumed: o.meals_consumed,
          consumedAt: o.consumed_at,
          orderTotal: o.order_total,
          orderItems: o.order_items,
        })),
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  lookupCustomer,
  getAllowedMenuItems,
  requestOrderOTP,
  verifyOTPAndCreateOrder,
  getDashboard,
  getConsumptionHistory,
  getAllOrders,
};
