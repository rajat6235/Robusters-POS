const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/errors');

class CustomerController {
  // Create a new customer
  static async createCustomer(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new BadRequestError('Validation failed'));
      }

      const customerData = {
        phone: req.body.phone,
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        dateOfBirth: req.body.dateOfBirth
      };

      const customer = await Customer.create(customerData);

      res.status(201).json({
        success: true,
        data: { customer },
        message: 'Customer created successfully'
      });
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        if (error.constraint === 'customers_phone_key') {
          return next(new ConflictError('Phone number already exists'));
        }
        if (error.constraint === 'customers_email_key') {
          return next(new ConflictError('Email already exists'));
        }
      }
      next(error);
    }
  }

  // Get all customers with pagination and search
  static async getCustomers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'recent';

      const result = await Customer.getAll(page, limit, search, sortBy);

      res.json({
        success: true,
        data: result,
        message: 'Customers retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get customer by ID
  static async getCustomerById(req, res, next) {
    try {
      const { id } = req.params;
      const customer = await Customer.findById(id);

      if (!customer) {
        return next(new NotFoundError('Customer not found'));
      }

      res.json({
        success: true,
        data: { customer },
        message: 'Customer retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Find or create customer (used during order creation)
  static async findOrCreateCustomer(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new BadRequestError('Validation failed'));
      }

      const customerData = {
        phone: req.body.phone,
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName
      };

      const result = await Customer.findOrCreate(customerData);

      res.json({
        success: true,
        data: result,
        message: result.isNew ? 'Customer created successfully' : 'Customer found'
      });
    } catch (error) {
      next(error);
    }
  }

  // Update customer
  static async updateCustomer(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new BadRequestError('Validation failed'));
      }

      const { id } = req.params;
      const updateData = {
        phone: req.body.phone,
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        dateOfBirth: req.body.dateOfBirth
      };

      const customer = await Customer.update(id, updateData);

      if (!customer) {
        return next(new NotFoundError('Customer not found'));
      }

      res.json({
        success: true,
        data: { customer },
        message: 'Customer updated successfully'
      });
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        if (error.constraint === 'customers_phone_key') {
          return next(new ConflictError('Phone number already exists'));
        }
        if (error.constraint === 'customers_email_key') {
          return next(new ConflictError('Email already exists'));
        }
      }
      next(error);
    }
  }

  // Get customer order history
  static async getCustomerOrders(req, res, next) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // Verify customer exists
      const customer = await Customer.findById(id);
      if (!customer) {
        return next(new NotFoundError('Customer not found'));
      }

      const result = await Customer.getOrderHistory(id, page, limit);

      res.json({
        success: true,
        data: result,
        message: 'Customer order history retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Update customer preferences
  static async updatePreferences(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new BadRequestError('Validation failed'));
      }

      const { id } = req.params;
      
      // Verify customer exists
      const customer = await Customer.findById(id);
      if (!customer) {
        return next(new NotFoundError('Customer not found'));
      }

      const preferences = {
        dietaryRestrictions: req.body.dietaryRestrictions,
        allergies: req.body.allergies,
        favoriteItems: req.body.favoriteItems,
        preferredPaymentMethod: req.body.preferredPaymentMethod,
        notes: req.body.notes
      };

      const updatedPreferences = await Customer.updatePreferences(id, preferences);

      res.json({
        success: true,
        data: { preferences: updatedPreferences },
        message: 'Customer preferences updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Deactivate customer
  static async deactivateCustomer(req, res, next) {
    try {
      const { id } = req.params;
      const customer = await Customer.deactivate(id);

      if (!customer) {
        return next(new NotFoundError('Customer not found'));
      }

      res.json({
        success: true,
        data: { customer },
        message: 'Customer deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get top customers by spending
  static async getTopCustomers(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const customers = await Customer.getTopCustomers(limit);

      res.json({
        success: true,
        data: { customers },
        message: 'Top customers retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Search customers by name, phone, or email
  static async searchCustomers(req, res, next) {
    try {
      const { query } = req.query;

      if (!query || query.length < 2) {
        return next(new BadRequestError('Search query must be at least 2 characters'));
      }

      const customers = await Customer.search(query, 10);

      res.json({
        success: true,
        data: { customers },
        message: customers.length > 0 ? `${customers.length} customer(s) found` : 'No customer found'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CustomerController;