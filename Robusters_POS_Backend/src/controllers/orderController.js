/**
 * Order Controller
 * Handles all order-related operations.
 */

const Order = require('../models/Order');
const Customer = require('../models/Customer');
const MenuItem = require('../models/MenuItem');
const { calculateItemPrice, calculateOrderTotal } = require('../utils/priceCalculator');
const { NotFoundError, BadRequestError } = require('../utils/errors');

/**
 * Create a new order
 * POST /api/orders
 */
const createOrder = async (req, res, next) => {
  try {
    const { customerPhone, customerName, customerEmail, items, paymentMethod, notes, locationId } = req.body;
    const createdBy = req.user.id;

    if (!items || items.length === 0) {
      throw new BadRequestError('Order must contain at least one item');
    }

    // Find or create customer if customer info provided
    let customer = null;
    let customerResult = null;
    if (customerPhone || customerEmail) {
      const customerData = {
        phone: customerPhone,
        email: customerEmail,
        firstName: customerName?.split(' ')[0] || 'Customer',
        lastName: customerName?.split(' ').slice(1).join(' ') || ''
      };

      customerResult = await Customer.findOrCreate(customerData);
      customer = customerResult.customer;
    }

    // Calculate order totals
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      // Get menu item details
      const menuItem = await MenuItem.findById(item.itemId);
      if (!menuItem) {
        throw new NotFoundError(`Menu item ${item.itemId} not found`);
      }

      if (!menuItem.is_available) {
        throw new BadRequestError(`Menu item ${menuItem.name} is not available`);
      }

      // Use custom price if provided, otherwise calculate from DB
      let unitPrice;
      if (item.customUnitPrice !== undefined && item.customUnitPrice !== null) {
        unitPrice = parseFloat(item.customUnitPrice);
        if (isNaN(unitPrice) || unitPrice < 0) {
          throw new BadRequestError(`Invalid custom price for item ${menuItem.name}`);
        }
      } else {
        const priceResult = await calculateItemPrice({
          itemId: item.itemId,
          variantIds: item.variantIds || [],
          addonSelections: item.addonSelections || [],
        });
        unitPrice = priceResult.totalPrice;
      }

      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      processedItems.push({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        variantIds: item.variantIds,
        addonSelections: item.addonSelections,
        specialInstructions: item.specialInstructions,
      });
    }

    // Calculate tax (no tax)
    const tax = 0;
    const total = subtotal;

    // Validate loyalty payment: customer must exist and have enough points
    if (paymentMethod === 'LOYALTY') {
      if (!customer) {
        throw new BadRequestError('Loyalty payment requires a linked customer');
      }
      const loyaltyPoints = parseInt(customer.loyalty_points) || 0;
      if (loyaltyPoints < total) {
        throw new BadRequestError(`Insufficient loyalty points. Customer has ${loyaltyPoints} points but order total is ${total}`);
      }
    }

    // Create order
    const order = await Order.create({
      customerPhone,
      customerName,
      customerId: customer?.id,
      items: processedItems,
      subtotal,
      tax,
      total,
      paymentMethod,
      notes,
      createdBy,
      locationId,
    });

    // Link order to customer and update stats if customer exists
    if (customer) {
      await Customer.linkOrder(customer.id, order.id);
      await Customer.updateStats(customer.id, order.total);

      // Deduct loyalty points if paying with loyalty
      if (paymentMethod === 'LOYALTY') {
        await Customer.deductLoyaltyPoints(customer.id, total);
      }
    }

    res.status(201).json({
      success: true,
      data: { 
        order,
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
    } = req.query;

    const result = await Order.findAllWithItems({
      page: parseInt(page),
      limit: parseInt(limit),
      startDate,
      endDate,
      customerPhone,
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
  getOrders,
  getOrder,
  updatePaymentStatus,
  getOrderStats,
  requestCancellation,
  approveCancellation,
  getCancellationRequests,
  getOrderStatusHistory,
};