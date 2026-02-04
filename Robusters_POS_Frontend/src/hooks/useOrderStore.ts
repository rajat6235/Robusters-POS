'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuItem, Variant, Addon } from '@/types/menu';
import { orderService, CreateOrderRequest, Order, CancellationRequest, StatusHistoryEntry } from '@/services/orderService';
import { toast } from 'sonner';

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  selectedVariants: Variant[];
  quantity: number;
  addonSelections: { addon: Addon; quantity: number }[];
  specialInstructions?: string;
}

/** Calculate unit price for a cart item (sync, no API call) */
export function calcItemUnitPrice(item: CartItem): number {
  const variantTotal = item.selectedVariants.reduce((sum, v) => sum + v.price, 0);
  const addonTotal = item.addonSelections.reduce(
    (sum, s) => sum + s.addon.price * s.quantity,
    0
  );
  // For variant items basePrice is 0; variant price IS the item price
  return item.menuItem.basePrice + variantTotal + addonTotal;
}

interface OrderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface OrderStore {
  cart: CartItem[];
  orders: Order[];
  pagination: OrderPagination | null;
  cancellationRequests: CancellationRequest[];
  customerPhone: string;
  customerName: string;
  customerId: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;

  // Cart actions
  addToCart: (
    menuItem: MenuItem,
    selectedVariants: Variant[],
    quantity: number,
    addonSelections?: { addon: Addon; quantity: number }[],
    specialInstructions?: string
  ) => void;
  updateCartItem: (cartItemId: string, updates: Partial<CartItem>) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;

  // Customer info
  setCustomerInfo: (phone: string, name: string, customerId?: string) => void;
  clearCustomerInfo: () => void;

  // Order actions
  createOrder: (paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'LOYALTY', notes?: string, locationId?: string, priceOverrides?: Record<string, number>) => Promise<Order>;
  loadOrders: () => Promise<void>;
  loadMoreOrders: () => Promise<void>;

  // Cancellation actions
  requestCancellation: (orderId: string, reason: string) => Promise<void>;
  approveCancellation: (orderId: string, approved: boolean, adminNotes?: string) => Promise<void>;
  loadCancellationRequests: () => Promise<void>;
  getOrderStatusHistory: (orderId: string) => Promise<StatusHistoryEntry[]>;

  // Calculated values (sync)
  getCartSubtotal: () => number;
  getCartTotal: () => number;
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      cart: [],
      orders: [],
      pagination: null,
      cancellationRequests: [],
      customerPhone: '',
      customerName: '',
      customerId: null,
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      error: null,

      addToCart: (menuItem, selectedVariants, quantity, addonSelections = [], specialInstructions) => {
        const cartItem: CartItem = {
          id: `cart-${Date.now()}-${Math.random()}`,
          menuItem,
          selectedVariants,
          quantity,
          addonSelections,
          specialInstructions,
        };

        set(state => ({
          cart: [...state.cart, cartItem]
        }));
      },

      updateCartItem: (cartItemId, updates) => {
        set(state => ({
          cart: state.cart.map(item =>
            item.id === cartItemId ? { ...item, ...updates } : item
          )
        }));
      },

      removeFromCart: (cartItemId) => {
        set(state => ({
          cart: state.cart.filter(item => item.id !== cartItemId)
        }));
      },

      clearCart: () => {
        set({ cart: [] });
      },

      setCustomerInfo: (phone, name, customerId) => {
        set({ customerPhone: phone, customerName: name, customerId: customerId || null });
      },

      clearCustomerInfo: () => {
        set({ customerPhone: '', customerName: '', customerId: null });
      },

      createOrder: async (paymentMethod, notes, locationId, priceOverrides) => {
        const state = get();
        set({ isLoading: true, error: null });

        try {
          const orderItems = state.cart.map(cartItem => {
            const item: any = {
              itemId: cartItem.menuItem.id,
              quantity: cartItem.quantity,
              variantIds: cartItem.selectedVariants.map(v => v.id),
              addonSelections: cartItem.addonSelections.map(selection => ({
                addonId: selection.addon.id,
                quantity: selection.quantity
              })),
              specialInstructions: cartItem.specialInstructions
            };
            if (priceOverrides && priceOverrides[cartItem.id] !== undefined) {
              item.customUnitPrice = priceOverrides[cartItem.id];
            }
            return item;
          });

          const orderData: CreateOrderRequest = {
            customerPhone: state.customerPhone || undefined,
            customerName: state.customerName || undefined,
            items: orderItems,
            paymentMethod,
            notes,
            locationId,
          };

          const response = await orderService.createOrder(orderData);

          if (response.success) {
            set(state => ({
              orders: [response.data.order, ...state.orders],
              pagination: state.pagination ? { ...state.pagination, total: state.pagination.total + 1 } : null,
              cart: [],
              customerPhone: '',
              customerName: '',
              customerId: null,
              isLoading: false
            }));

            return response.data.order;
          } else {
            throw new Error('Failed to create order');
          }
        } catch (error: any) {
          set({
            error: error.response?.data?.message || error.message || 'Failed to create order',
            isLoading: false
          });
          throw error;
        }
      },

      loadOrders: async () => {
        if (get().isLoading) return;
        set({ isLoading: true, error: null });
        try {
          const response = await orderService.getOrders(1, 20);
          const pag = response.data.pagination;
          set({
            orders: response.data.orders || [],
            pagination: pag || null,
            hasMore: pag ? pag.page < pag.totalPages : false,
            isLoading: false
          });
        } catch (error: any) {
          console.error('Load orders error:', error);
          set({
            error: error.response?.data?.message || error.message || 'Failed to load orders',
            isLoading: false
          });
        }
      },

      loadMoreOrders: async () => {
        const state = get();
        if (state.isLoadingMore || !state.hasMore || !state.pagination) return;

        const nextPage = state.pagination.page + 1;
        set({ isLoadingMore: true });
        try {
          const response = await orderService.getOrders(nextPage, 20);
          const pag = response.data.pagination;
          const newOrders = response.data.orders || [];
          set(state => ({
            orders: [...state.orders, ...newOrders],
            pagination: pag || null,
            hasMore: pag ? pag.page < pag.totalPages : false,
            isLoadingMore: false
          }));
        } catch (error: any) {
          console.error('Load more orders error:', error);
          set({ isLoadingMore: false });
        }
      },

      requestCancellation: async (orderId: string, reason: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await orderService.requestCancellation(orderId, reason);
          // Show the API message which includes loyalty points info
          toast.success(response.message);
          // Refresh orders to show updated status
          await get().loadOrders();
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || error.message || 'Failed to request cancellation',
            isLoading: false
          });
          throw error;
        }
      },

      approveCancellation: async (orderId: string, approved: boolean, adminNotes?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await orderService.approveCancellation(orderId, approved, adminNotes);
          // Show the API message which includes refund info
          toast.success(response.message);
          // Refresh orders and cancellation requests
          await Promise.all([
            get().loadOrders(),
            get().loadCancellationRequests()
          ]);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || error.message || 'Failed to process cancellation',
            isLoading: false
          });
          throw error;
        }
      },

      loadCancellationRequests: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await orderService.getCancellationRequests();
          set({
            cancellationRequests: response.data.requests || [],
            isLoading: false
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || error.message || 'Failed to load cancellation requests',
            isLoading: false
          });
        }
      },

      getOrderStatusHistory: async (orderId: string): Promise<StatusHistoryEntry[]> => {
        try {
          const response = await orderService.getOrderStatusHistory(orderId);
          return response.data.history || [];
        } catch (error: any) {
          set({
            error: error.response?.data?.message || error.message || 'Failed to load order history'
          });
          return [];
        }
      },

      // Synchronous price calculations (no API call needed)
      getCartSubtotal: () => {
        const state = get();
        return state.cart.reduce((sum, item) => sum + calcItemUnitPrice(item) * item.quantity, 0);
      },

      getCartTotal: () => {
        return get().getCartSubtotal();
      },
    }),
    {
      name: 'robusters-order-storage',
      partialize: (state) => ({
        cart: state.cart,
        customerPhone: state.customerPhone,
        customerName: state.customerName,
        customerId: state.customerId
      }),
    }
  )
);
