'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuItem, Variant, Addon } from '@/types/menu';
import { orderService, CreateOrderRequest, Order } from '@/services/orderService';

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

interface OrderStore {
  cart: CartItem[];
  orders: Order[];
  customerPhone: string;
  customerName: string;
  customerId: string | null;
  isLoading: boolean;
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
  createOrder: (paymentMethod: 'CASH' | 'CARD' | 'UPI', notes?: string) => Promise<Order>;
  loadOrders: (page?: number, limit?: number) => Promise<void>;

  // Calculated values (sync)
  getCartSubtotal: () => number;
  getCartTotal: () => number;
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      cart: [],
      orders: [],
      customerPhone: '',
      customerName: '',
      customerId: null,
      isLoading: false,
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

      createOrder: async (paymentMethod, notes) => {
        const state = get();
        set({ isLoading: true, error: null });

        try {
          const orderItems = state.cart.map(cartItem => ({
            itemId: cartItem.menuItem.id,
            quantity: cartItem.quantity,
            variantIds: cartItem.selectedVariants.map(v => v.id),
            addonSelections: cartItem.addonSelections.map(selection => ({
              addonId: selection.addon.id,
              quantity: selection.quantity
            })),
            specialInstructions: cartItem.specialInstructions
          }));

          const orderData: CreateOrderRequest = {
            customerPhone: state.customerPhone || undefined,
            customerName: state.customerName || undefined,
            items: orderItems,
            paymentMethod,
            notes
          };

          const response = await orderService.createOrder(orderData);

          if (response.success) {
            set(state => ({
              orders: [response.data.order, ...state.orders],
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

      loadOrders: async (page = 1, limit = 20) => {
        set({ isLoading: true, error: null });
        try {
          const response = await orderService.getOrders(page, limit);
          set({
            orders: response.data.orders || [],
            isLoading: false
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || error.message || 'Failed to load orders',
            isLoading: false
          });
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
