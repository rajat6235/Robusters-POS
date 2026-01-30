import { apiClient } from '@/lib/api';

export interface Customer {
  id: string;
  phone: string;
  email?: string;
  first_name: string;
  last_name?: string;
  date_of_birth?: string;
  total_orders: number;
  total_spent: string | number; // Can be string from DB
  loyalty_points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Preferences
  dietary_restrictions?: string[];
  allergies?: string[];
  favorite_items?: string[];
  preferred_payment_method?: string;
  preference_notes?: string;
}

export interface CreateCustomerRequest {
  phone: string;
  email?: string;
  firstName: string;
  lastName?: string;
  dateOfBirth?: string;
}

export interface UpdateCustomerRequest {
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
}

export interface CustomerPreferences {
  dietaryRestrictions?: string[];
  allergies?: string[];
  favoriteItems?: string[];
  preferredPaymentMethod?: string;
  notes?: string;
}

export interface FindOrCreateCustomerRequest {
  phone?: string;
  email?: string;
  firstName: string;
  lastName?: string;
}

export interface CustomerSearchResult {
  customers: Customer[];
}

export interface CustomersListResponse {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CustomerOrdersResponse {
  orders: {
    id: string;
    order_number: string;
    total: number;
    subtotal: number;
    tax: number;
    payment_method: string;
    payment_status: string;
    created_at: string;
    notes?: string;
    items: {
      id: string;
      menu_item_id: string;
      item_name: string;
      diet_type: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      special_instructions?: string;
      variants: {
        name: string;
        price: number;
      }[];
      addons: {
        name: string;
        price: number;
      }[];
    }[];
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class CustomerService {
  // Create a new customer
  async createCustomer(data: CreateCustomerRequest) {
    const response = await apiClient.post('/customers', data);
    return response.data;
  }

  // Get all customers with pagination and search
  async getCustomers(page = 1, limit = 20, search = '', sortBy = 'recent') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
    });

    if (search) {
      params.append('search', search);
    }

    const response = await apiClient.get(`/customers?${params}`);
    return response.data as { success: boolean; data: CustomersListResponse };
  }

  // Get customer by ID
  async getCustomerById(id: string) {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data as { success: boolean; data: { customer: Customer } };
  }

  // Update customer
  async updateCustomer(id: string, data: UpdateCustomerRequest) {
    const response = await apiClient.patch(`/customers/${id}`, data);
    return response.data;
  }

  // Find or create customer (used during order creation)
  async findOrCreateCustomer(data: FindOrCreateCustomerRequest) {
    const response = await apiClient.post('/customers/find-or-create', data);
    return response.data as { 
      success: boolean; 
      data: { 
        customer: Customer; 
        isNew: boolean; 
      } 
    };
  }

  // Search customers by phone or email
  async searchCustomers(query: string) {
    const response = await apiClient.get(`/customers/search?query=${encodeURIComponent(query)}`);
    return response.data as { success: boolean; data: CustomerSearchResult };
  }

  // Get customer order history
  async getCustomerOrders(id: string, page = 1, limit = 10) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await apiClient.get(`/customers/${id}/orders?${params}`);
    return response.data as { success: boolean; data: CustomerOrdersResponse };
  }

  // Update customer preferences
  async updatePreferences(id: string, preferences: CustomerPreferences) {
    const response = await apiClient.patch(`/customers/${id}/preferences`, preferences);
    return response.data;
  }

  // Deactivate customer
  async deactivateCustomer(id: string) {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  }

  // Get top customers by spending
  async getTopCustomers(limit = 10) {
    const response = await apiClient.get(`/customers/top?limit=${limit}`);
    return response.data as { success: boolean; data: { customers: Customer[] } };
  }
}

export const customerService = new CustomerService();