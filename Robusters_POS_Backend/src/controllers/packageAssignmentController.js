/**
 * Package Assignment Controller
 * Handles customer package assignments and consumption tracking
 */

const CustomerPackage = require('../models/CustomerPackage');
const MealPackage = require('../models/MealPackage');
const Customer = require('../models/Customer');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');
const { logPackageActivity } = require('../utils/packageActivityLogger');

/**
 * Assign package to customer
 * POST /api/admin/customer-packages
 */
const assignPackage = async (req, res, next) => {
  try {
    const {
      customerId,
      packageId,
      totalMeals,
      consumedMeals,
      packagePrice,
      amountPaid,
      paymentStatus,
      startsAt,
      expiresAt,
      notes,
    } = req.body;
    const userId = req.user.id;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Verify package exists
    const package = await MealPackage.findById(packageId);
    if (!package) {
      throw new NotFoundError('Meal package not found');
    }

    if (!package.is_active) {
      throw new BadRequestError('Cannot assign inactive package');
    }

    const finalTotalMeals = totalMeals || package.meal_count;
    const finalConsumedMeals = consumedMeals || 0;
    const finalPackagePrice = packagePrice !== undefined ? packagePrice : package.price;
    const finalAmountPaid = amountPaid || 0;

    if (finalConsumedMeals > finalTotalMeals) {
      throw new BadRequestError('Consumed meals cannot exceed total meals');
    }
    if (finalAmountPaid > finalPackagePrice) {
      throw new BadRequestError('Amount paid cannot exceed package price');
    }

    const assignment = await CustomerPackage.assign({
      customerId,
      packageId,
      totalMeals: finalTotalMeals,
      consumedMeals: finalConsumedMeals,
      packagePrice: finalPackagePrice,
      amountPaid: finalAmountPaid,
      paymentStatus: paymentStatus || 'pending',
      startsAt: startsAt || new Date().toISOString().split('T')[0],
      expiresAt,
      assignedBy: userId,
      notes,
    });

    // Log activity
    await logPackageActivity({
      entityType: 'assignment',
      entityId: assignment.id,
      action: 'package_assigned',
      performedBy: userId,
      customerId,
      packageId,
      changes: {
        before: null,
        after: assignment,
      },
      metadata: {
        customerName: `${customer.first_name} ${customer.last_name}`,
        packageName: package.name,
        totalMeals: assignment.total_meals,
        packagePrice: assignment.package_price,
      },
    });

    res.status(201).json({
      success: true,
      data: { assignment },
      message: 'Package assigned successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get packages for customer
 * GET /api/admin/customers/:customerId/packages
 */
const getCustomerPackages = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { status, limit, offset } = req.query;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const { packages, total } = await CustomerPackage.findByCustomer(customerId, {
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    res.json({
      success: true,
      data: { packages, count: total },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get package assignment by ID
 * GET /api/admin/customer-packages/:id
 */
const getAssignmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { includeConsumption } = req.query;

    let assignment;
    if (includeConsumption === 'true') {
      assignment = await CustomerPackage.findByIdWithConsumption(id);
    } else {
      assignment = await CustomerPackage.findById(id);
    }

    if (!assignment) {
      throw new NotFoundError('Package assignment not found');
    }

    res.json({
      success: true,
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update package assignment
 * PUT /api/admin/customer-packages/:id
 */
const updateAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { totalMeals, packagePrice, amountPaid, paymentStatus, expiresAt, notes } = req.body;
    const userId = req.user.id;

    // Get current state
    const before = await CustomerPackage.findById(id);
    if (!before) {
      throw new NotFoundError('Package assignment not found');
    }

    if (before.status === 'cancelled') {
      throw new BadRequestError('Cannot update cancelled package');
    }

    if (before.status === 'completed') {
      throw new BadRequestError('Cannot update completed package');
    }

    // Cross-field checks against the effective (merged) values — a patch
    // that only touches one side of a pair must still respect the other.
    const finalTotalMeals = totalMeals !== undefined ? totalMeals : before.total_meals;
    const finalPackagePrice = packagePrice !== undefined ? packagePrice : before.package_price;
    const finalAmountPaid = amountPaid !== undefined ? amountPaid : before.amount_paid;

    if (before.consumed_meals > finalTotalMeals) {
      throw new BadRequestError('Total meals cannot be less than meals already consumed');
    }
    if (finalAmountPaid > finalPackagePrice) {
      throw new BadRequestError('Amount paid cannot exceed package price');
    }

    const assignment = await CustomerPackage.update(id, {
      totalMeals,
      packagePrice,
      amountPaid,
      paymentStatus,
      expiresAt,
      notes,
    });

    // Log activity
    await logPackageActivity({
      entityType: 'assignment',
      entityId: id,
      action: 'assignment_updated',
      performedBy: userId,
      customerId: assignment.customer_id,
      packageId: assignment.package_id,
      changes: {
        before,
        after: assignment,
      },
    });

    res.json({
      success: true,
      data: { assignment },
      message: 'Package assignment updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel package assignment
 * POST /api/admin/customer-packages/:id/cancel
 */
const cancelAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const before = await CustomerPackage.findById(id);
    if (!before) {
      throw new NotFoundError('Package assignment not found');
    }

    if (before.status !== 'active') {
      throw new BadRequestError('Only active packages can be cancelled');
    }

    const assignment = await CustomerPackage.cancel(id, {
      reason,
      cancelledBy: userId,
    });

    if (!assignment) {
      throw new BadRequestError('Failed to cancel package');
    }

    // Log activity
    await logPackageActivity({
      entityType: 'assignment',
      entityId: id,
      action: 'assignment_cancelled',
      performedBy: userId,
      customerId: assignment.customer_id,
      packageId: assignment.package_id,
      changes: {
        before,
        after: assignment,
      },
      metadata: {
        reason,
      },
    });

    res.json({
      success: true,
      data: { assignment },
      message: 'Package cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually mark an active package assignment as completed — distinct from
 * cancel (voided) and from the automatic completion that fires once
 * consumed_meals reaches total_meals. Allowed with meals still remaining;
 * those meals are forfeited (recorded in the activity log for the audit
 * trail), matching how cancel already has no remaining-meals restriction.
 * POST /api/admin/customer-packages/:id/complete
 */
const completeAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const before = await CustomerPackage.findById(id);
    if (!before) {
      throw new NotFoundError('Package assignment not found');
    }

    if (before.status !== 'active') {
      throw new BadRequestError('Only active packages can be marked completed');
    }

    const assignment = await CustomerPackage.complete(id);

    if (!assignment) {
      throw new BadRequestError('Failed to complete package');
    }

    // Log activity
    await logPackageActivity({
      entityType: 'assignment',
      entityId: id,
      action: 'assignment_completed_manually',
      performedBy: userId,
      customerId: assignment.customer_id,
      packageId: assignment.package_id,
      changes: {
        before,
        after: assignment,
      },
      metadata: {
        remainingMealsForfeited: assignment.total_meals - assignment.consumed_meals,
      },
    });

    res.json({
      success: true,
      data: { assignment },
      message: 'Package marked as completed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record meal consumption
 * POST /api/admin/customer-packages/:id/consumption
 */
const recordConsumption = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderId, mealsConsumed, orderTotal, orderItems } = req.body;
    const userId = req.user.id;

    // Verify package assignment exists
    const assignment = await CustomerPackage.findById(id);
    if (!assignment) {
      throw new NotFoundError('Package assignment not found');
    }

    if (assignment.status !== 'active') {
      throw new BadRequestError('Can only consume from active packages');
    }

    if (assignment.consumed_meals >= assignment.total_meals) {
      throw new BadRequestError('Package already fully consumed');
    }

    if (assignment.consumed_meals + (mealsConsumed || 1) > assignment.total_meals) {
      throw new BadRequestError('Consumption exceeds remaining meals');
    }

    const consumption = await CustomerPackage.recordConsumption({
      customerPackageId: id,
      orderId,
      mealsConsumed: mealsConsumed || 1,
      orderTotal,
      orderItems,
    });

    // Log activity
    await logPackageActivity({
      entityType: 'consumption',
      entityId: consumption.id,
      action: 'meal_consumed',
      performedBy: userId,
      customerId: assignment.customer_id,
      packageId: assignment.package_id,
      metadata: {
        orderId,
        mealsConsumed: consumption.meals_consumed,
        orderTotal,
        remainingMeals: consumption.package.remaining_meals,
      },
    });

    res.status(201).json({
      success: true,
      data: { consumption },
      message: 'Meal consumption recorded successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get consumption history
 * GET /api/admin/customer-packages/:id/consumption
 */
const getConsumptionHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;

    // Verify package assignment exists
    const assignment = await CustomerPackage.findById(id);
    if (!assignment) {
      throw new NotFoundError('Package assignment not found');
    }

    const history = await CustomerPackage.getConsumptionHistory(id, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    res.json({
      success: true,
      data: { history, count: history.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active packages
 * GET /api/admin/customer-packages/active
 */
const getAllActivePackages = async (req, res, next) => {
  try {
    const { limit, offset } = req.query;

    const { packages, total } = await CustomerPackage.getAllActive({
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    res.json({
      success: true,
      data: { packages, count: total },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get expiring packages
 * GET /api/admin/customer-packages/expiring
 */
const getExpiringPackages = async (req, res, next) => {
  try {
    const { days } = req.query;
    const daysThreshold = days ? parseInt(days, 10) : 7;

    const packages = await CustomerPackage.getExpiringPackages(daysThreshold);

    res.json({
      success: true,
      data: { packages, count: packages.length, daysThreshold },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active package count for customer
 * GET /api/admin/customers/:customerId/packages/count
 */
const getActivePackageCount = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const count = await CustomerPackage.getActiveCount(customerId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk assign packages
 * POST /api/admin/customer-packages/bulk
 */
const bulkAssignPackages = async (req, res, next) => {
  try {
    const { assignments } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new BadRequestError('Assignments array is required and must not be empty');
    }

    // Add assignedBy to all assignments
    const assignmentsWithUser = assignments.map(assignment => ({
      ...assignment,
      assignedBy: userId,
    }));

    const results = await CustomerPackage.bulkAssign(assignmentsWithUser);

    // Log activity for bulk operation
    await logPackageActivity({
      entityType: 'assignment',
      entityId: null,
      action: 'bulk_packages_assigned',
      performedBy: userId,
      metadata: {
        count: results.length,
        assignmentIds: results.map(r => r.id),
      },
    });

    res.status(201).json({
      success: true,
      data: { assignments: results, count: results.length },
      message: `${results.length} packages assigned successfully`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assignPackage,
  getCustomerPackages,
  getAssignmentById,
  updateAssignment,
  cancelAssignment,
  completeAssignment,
  recordConsumption,
  getConsumptionHistory,
  getAllActivePackages,
  getExpiringPackages,
  getActivePackageCount,
  bulkAssignPackages,
};
