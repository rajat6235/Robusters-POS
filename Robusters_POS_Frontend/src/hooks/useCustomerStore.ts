'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { customerService, Customer, CreateCustomerRequest, UpdateCustomerRequest, CustomerPreferences } from '@/services/customerService';

interface CustomerStore {
  customers: Customer[];
  selectedCustomer: Customer | null;
  isLoading: boolean;
  error: string | null;
  searchResults: Customer[];
  
  // Actions
  loadCustomers: (page?: number, limit?: number, search?: string) => Promise<void>;
  createCustomer: (data: CreateCustomerRequest) => Promise<Customer>;
  updateCustomer: (id: string, data: UpdateCustomerRequest) => Promise<Customer>;
  getCustomerById: (id: string) => Promise<Customer>;
  searchCustomers: (query: string) => Promise<Customer | null>;
  findOrCreateCustomer: (data: any) => Promise<{ customer: Customer; isNew: boolean }>;
  updatePreferences: (id: string, preferences: CustomerPreferences) => Promise<void>;
  deactivateCustomer: (id: string) => Promise<void>;
  getTopCustomers: (limit?: number) => Promise<Customer[]>;
  
  // UI State
  setSelectedCustomer: (customer: Customer | null) => void;
  clearError: () => void;
  clearSearchResults: () => void;
}

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      customers: [],
      selectedCustomer: null,
      isLoading: false,
      error: null,
      searchResults: [],

      loadCustomers: async (page = 1, limit = 20, search = '') => {
        set({ isLoading: true, error: null });
        try {
          const response = await customerService.getCustomers(page, limit, search);
          set({ 
            customers: response.data.customers,
            isLoading: false 
          });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to load customers',
            isLoading: false 
          });
        }
      },

      createCustomer: async (data: CreateCustomerRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await customerService.createCustomer(data);
          const newCustomer = response.data.customer;
          
          set(state => ({
            customers: [newCustomer, ...state.customers],
            isLoading: false
          }));
          
          return newCustomer;
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to create customer',
            isLoading: false 
          });
          throw error;
        }
      },

      updateCustomer: async (id: string, data: UpdateCustomerRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await customerService.updateCustomer(id, data);
          const updatedCustomer = response.data.customer;
          
          set(state => ({
            customers: state.customers.map(customer =>
              customer.id === id ? updatedCustomer : customer
            ),
            selectedCustomer: state.selectedCustomer?.id === id ? updatedCustomer : state.selectedCustomer,
            isLoading: false
          }));
          
          return updatedCustomer;
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to update customer',
            isLoading: false 
          });
          throw error;
        }
      },

      getCustomerById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await customerService.getCustomerById(id);
          const customer = response.data.customer;
          
          set({ 
            selectedCustomer: customer,
            isLoading: false 
          });
          
          return customer;
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to get customer',
            isLoading: false 
          });
          throw error;
        }
      },

      searchCustomers: async (query: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await customerService.searchCustomers(query);
          const customers = response.data.customers;
          
          set({ 
            searchResults: customers || [],
            isLoading: false 
          });
          
          return customers[0] || null; // Return first customer or null
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to search customers',
            isLoading: false 
          });
          return null;
        }
      },

      findOrCreateCustomer: async (data: any) => {
        set({ isLoading: true, error: null });
        try {
          const response = await customerService.findOrCreateCustomer(data);
          const result = response.data;
          
          // Add to customers list if new
          if (result.isNew) {
            set(state => ({
              customers: [result.customer, ...state.customers],
              isLoading: false
            }));
          } else {
            set({ isLoading: false });
          }
          
          return result;
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to find or create customer',
            isLoading: false 
          });
          throw error;
        }
      },

      updatePreferences: async (id: string, preferences: CustomerPreferences) => {
        set({ isLoading: true, error: null });
        try {
          await customerService.updatePreferences(id, preferences);
          
          // Refresh customer data
          const response = await customerService.getCustomerById(id);
          const updatedCustomer = response.data.customer;
          
          set(state => ({
            customers: state.customers.map(customer =>
              customer.id === id ? updatedCustomer : customer
            ),
            selectedCustomer: state.selectedCustomer?.id === id ? updatedCustomer : state.selectedCustomer,
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to update preferences',
            isLoading: false 
          });
          throw error;
        }
      },

      deactivateCustomer: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await customerService.deactivateCustomer(id);
          
          set(state => ({
            customers: state.customers.filter(customer => customer.id !== id),
            selectedCustomer: state.selectedCustomer?.id === id ? null : state.selectedCustomer,
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to deactivate customer',
            isLoading: false 
          });
          throw error;
        }
      },

      getTopCustomers: async (limit = 10) => {
        set({ isLoading: true, error: null });
        try {
          const response = await customerService.getTopCustomers(limit);
          const customers = response.data.customers;
          
          set({ isLoading: false });
          return customers;
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to get top customers',
            isLoading: false 
          });
          return [];
        }
      },

      setSelectedCustomer: (customer: Customer | null) => {
        set({ selectedCustomer: customer });
      },

      clearError: () => {
        set({ error: null });
      },

      clearSearchResults: () => {
        set({ searchResults: [] });
      },
    }),
    {
      name: 'customer-store',
      partialize: (state) => ({ 
        selectedCustomer: state.selectedCustomer 
      }), // Only persist selected customer
    }
  )
);