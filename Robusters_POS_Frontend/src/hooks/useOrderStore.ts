'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuItem, Variant, Addon } from '@/types/menu';
import { orderService, CreateOrderRequest, Order } from '@/services/orderService';
import { menuService } from '@/services/menuService';

interface CartItem {
  id: string;
  menuItem: MenuItem;
  selectedVariants: Variant[];
  quantity: number;
  addonSelections: { addon: Addon; quantity: number }[];
  specialInstructions?: string;
}

interface OrderStore {
  cart: CartItem[];
  orders: Order[];
  customerPhone: string;
  customerName: string;
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
  setCustomerInfo: (phone: string, name: string) => void;

  // Order actions
  createOrder: (paymentMethod: 'CASH' | 'CARD' | 'UPI', notes?: string) => Promise<Order>;
  loadOrders: (page?: number, limit?: number, status?: Order['status']) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;

  // Calculated values
  getCartSubtotal: () => Promise<number>;
  getCartTax: () => Promise<number>;
  getCartTotal: () => Promise<number>;
  getItemTotal: (item: CartItem) => Promise<number>;
}

const TAX_RATE = 0.05; // 5% GST

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      cart: [],
      orders: [],
      customerPhone: '',
      customerName: '',
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

      setCustomerInfo: (phone, name) => {
        set({ customerPhone: phone, customerName: name });
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
              cart: [], // Clear cart after successful order
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

      loadOrders: async (page = 1, limit = 20, status) => {
        set({ isLoading: true, error: null });
        try {
          const response = await orderService.getOrders(page, limit, status);
          set({
            orders: response.data.orders,
            isLoading: false
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || error.message || 'Failed to load orders',
            isLoading: false
          });
        }
      },

      updateOrderStatus: async (orderId, status) => {
        set({ isLoading: true, error: null });
        try {
          const response = await orderService.updateOrderStatus(orderId, status);
          if (response.success) {
            set(state => ({
              orders: state.orders.map(order =>
                order.id === orderId ? response.data.order : order
              ),
              isLoading: false
            }));
          }
        } catch (error: any) {
          set({
            error: error.response?.data?.message || error.message || 'Failed to update order status',
            isLoading: false
          });
          throw error;
        }
      },

      getCartSubtotal: async () => {
        const state = get();
        let subtotal = 0;

        for (const item of state.cart) {
          const itemTotal = await get().getItemTotal(item);
          subtotal += itemTotal;
        }

        return subtotal;
      },

      getCartTax: async () => {
        const subtotal = await get().getCartSubtotal();
        return subtotal * TAX_RATE;
      },

      getCartTotal: async () => {
        const subtotal = await get().getCartSubtotal();
        const tax = await get().getCartTax();
        return subtotal + tax;
      },

      getItemTotal: async (item) => {
        try {
          // Use the price calculation API for accurate pricing
          const response = await menuService.calculatePrice({
            itemId: item.menuItem.id,
            variantIds: item.selectedVariants.map(v => v.id),
            addonSelections: item.addonSelections.map(selection => ({
              addonId: selection.addon.id,
              quantity: selection.quantity
            }))
          });

          if (response.success) {
            return response.data.totalPrice * item.quantity;
          } else {
            // Fallback to manual calculation
            let total = item.menuItem.basePrice;
            total += item.selectedVariants.reduce((sum, variant) => sum + variant.price, 0);
            total += item.addonSelections.reduce((sum, selection) => sum + (selection.addon.price * selection.quantity), 0);
            return total * item.quantity;
          }
        } catch (error) {
          // Fallback to manual calculation on API error
          let total = item.menuItem.basePrice;
          total += item.selectedVariants.reduce((sum, variant) => sum + variant.price, 0);
          total += item.addonSelections.reduce((sum, selection) => sum + (selection.addon.price * selection.quantity), 0);
          return total * item.quantity;
        }
      },
    }),
    {
      name: 'robusters-order-storage',
      partialize: (state) => ({ 
        cart: state.cart,
        customerPhone: state.customerPhone,
        customerName: state.customerName
      }), // Only persist cart and customer info
    }
  )
);