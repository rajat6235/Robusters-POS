const express = require('express');
const CustomerController = require('../controllers/customerController');
const { authenticate, adminOnly, managerOrAdmin } = require('../middleware/auth');
const {
  createCustomerValidation,
  updateCustomerValidation,
  findOrCreateCustomerValidation,
  updatePreferencesValidation,
  getCustomersValidation,
  getCustomerOrdersValidation,
  customerIdValidation,
  searchCustomersValidation,
  getTopCustomersValidation
} = require('../validators/customers');

const router = express.Router();

// Public customer routes (accessible by all authenticated users)
router.post('/find-or-create', 
  authenticate,
  findOrCreateCustomerValidation,
  CustomerController.findOrCreateCustomer
);

router.get('/search', 
  authenticate,
  searchCustomersValidation,
  CustomerController.searchCustomers
);

// Admin and Manager routes
router.get('/', 
  authenticate,
  managerOrAdmin,
  getCustomersValidation,
  CustomerController.getCustomers
);

router.post('/', 
  authenticate,
  managerOrAdmin,
  createCustomerValidation,
  CustomerController.createCustomer
);

router.get('/top', 
  authenticate,
  managerOrAdmin,
  getTopCustomersValidation,
  CustomerController.getTopCustomers
);

router.get('/:id', 
  authenticate,
  managerOrAdmin,
  customerIdValidation,
  CustomerController.getCustomerById
);

router.patch('/:id', 
  authenticate,
  managerOrAdmin,
  updateCustomerValidation,
  CustomerController.updateCustomer
);

router.get('/:id/orders', 
  authenticate,
  managerOrAdmin,
  getCustomerOrdersValidation,
  CustomerController.getCustomerOrders
);

router.patch('/:id/preferences', 
  authenticate,
  managerOrAdmin,
  updatePreferencesValidation,
  CustomerController.updatePreferences
);

// Admin only routes
router.delete('/:id', 
  authenticate,
  adminOnly,
  customerIdValidation,
  CustomerController.deactivateCustomer
);

module.exports = router;