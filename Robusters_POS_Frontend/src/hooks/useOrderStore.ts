'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuItem, Variant, Addon } from '@/types/menu';
import { orderService, CreateOrderRequest, Order, CancellationRequest, StatusHistoryEntry } from '@/services/orderService';
import { toast } from 'sonner';

// Cancels the previous in-flight search request when a new one starts
let searchAbortController: AbortController | null = null;

// Stable per-order-attempt key so a network retry or accidental double-submit
// of the same order is deduped server-side instead of creating a duplicate
// order (and double-consuming a meal-package credit). Cleared once the cart
// empties (order placed, or cart cleared) so the next, genuinely new order
// gets a fresh key — mirrors the pattern already used in OTPVerificationStep.
let orderIdempotencyKey: string | null = null;

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  selectedVariants: Variant[];
  quantity: number;
  addonSelections: { addon: Addon; quantity: number }[];
  specialInstructions?: string;
}

/** Order-independent equality for two id lists (e.g. selected variant ids). */
function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sorted = (ids: string[]) => [...ids].sort();
  const [sa, sb] = [sorted(a), sorted(b)];
  return sa.every((id, i) => id === sb[i]);
}

/** Order-independent equality for two addon-selection lists (by addon id + quantity). */
function sameAddonSelections(
  a: { addon: Addon; quantity: number }[],
  b: { addon: Addon; quantity: number }[]
): boolean {
  if (a.length !== b.length) return false;
  const key = (s: { addon: Addon; quantity: number }) => `${s.addon.id}:${s.quantity}`;
  const sorted = (list: typeof a) => list.map(key).sort();
  const [sa, sb] = [sorted(a), sorted(b)];
  return sa.every((k, i) => k === sb[i]);
}

/** Calculate unit price for a cart item (sync, no API call) */
export function calcItemUnitPrice(item: CartItem): number {
  const base = parseFloat(String(item.menuItem?.basePrice ?? 0)) || 0;
  const variantTotal = item.selectedVariants.reduce(
    (sum, v) => sum + (parseFloat(String(v.price ?? 0)) || 0),
    0
  );
  const addonTotal = item.addonSelections.reduce(
    (sum, s) => sum + (parseFloat(String(s.addon.price ?? 0)) || 0) * (s.quantity || 1),
    0
  );
  // For variant items basePrice is 0; variant price IS the item price
  return base + variantTotal + addonTotal;
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
  createOrder: (paymentMethod: 'CASH' | 'CARD' | 'UPI', notes?: string, locationId?: string, priceOverrides?: Record<string, number>, loyaltyPointsToRedeem?: number, useMealPackage?: boolean) => Promise<Order>;
  loadOrders: (search?: string) => Promise<void>;
  loadMoreOrders: (search?: string) => Promise<void>;

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
        // Merge into an existing line for the same item/variants/addons/notes
        // instead of appending a new one — besides the obvious cart-UX win
        // (no more duplicate rows for "the same thing, added twice"), this
        // also matters for meal-package redemption: a package's per-item
        // max_quantity cap is enforced per matched rule across the cart, and
        // splitting one item across multiple lines used to be a way to dodge
        // that cap. A genuinely different variant/addon/note selection is
        // still its own line, since it's a materially different order.
        const sameKey = (item: CartItem) =>
          item.menuItem.id === menuItem.id &&
          (item.specialInstructions || '') === (specialInstructions || '') &&
          sameIdSet(item.selectedVariants.map(v => v.id), selectedVariants.map(v => v.id)) &&
          sameAddonSelections(item.addonSelections, addonSelections);

        set(state => {
          const existing = state.cart.find(sameKey);
          if (existing) {
            return {
              cart: state.cart.map(item =>
                item === existing ? { ...item, quantity: item.quantity + quantity } : item
              ),
            };
          }

          const cartItem: CartItem = {
            id: `cart-${Date.now()}-${Math.random()}`,
            menuItem,
            selectedVariants,
            quantity,
            addonSelections,
            specialInstructions,
          };
          return { cart: [...state.cart, cartItem] };
        });
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
        orderIdempotencyKey = null;
        set({ cart: [] });
      },

      setCustomerInfo: (phone, name, customerId) => {
        set({ customerPhone: phone, customerName: name, customerId: customerId || null });
      },

      clearCustomerInfo: () => {
        set({ customerPhone: '', customerName: '', customerId: null });
      },

      createOrder: async (paymentMethod, notes, locationId, priceOverrides, loyaltyPointsToRedeem, useMealPackage) => {
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
            customerId: state.customerId || undefined,
            customerPhone: state.customerPhone || undefined,
            customerName: state.customerName || undefined,
            items: orderItems,
            paymentMethod,
            loyaltyPointsToRedeem: loyaltyPointsToRedeem || undefined,
            notes,
            locationId,
            useMealPackage,
          };

          if (!orderIdempotencyKey) orderIdempotencyKey = crypto.randomUUID();
          const response = await orderService.createOrder(orderData, orderIdempotencyKey);

          if (response.success) {
            orderIdempotencyKey = null;
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

      loadOrders: async (search?: string) => {
        // Cancel any previous in-flight search request
        if (searchAbortController) searchAbortController.abort();
        searchAbortController = new AbortController();
        const signal = searchAbortController.signal;

        set({ isLoading: true, error: null });
        try {
          const response = await orderService.getOrders(1, 20, undefined, undefined, search, signal);
          if (signal.aborted) return; // Response arrived after a newer request — discard it
          const pag = response.data.pagination;
          set({
            orders: response.data.orders || [],
            pagination: pag || null,
            hasMore: pag ? pag.page < pag.totalPages : false,
            isLoading: false
          });
        } catch (error: any) {
          if (error.name === 'CanceledError' || error.name === 'AbortError') return; // Expected — ignore
          console.error('Load orders error:', error);
          set({
            error: error.response?.data?.message || error.message || 'Failed to load orders',
            isLoading: false
          });
        }
      },

      loadMoreOrders: async (search?: string) => {
        const state = get();
        if (state.isLoadingMore || !state.hasMore || !state.pagination) return;

        const nextPage = state.pagination.page + 1;
        set({ isLoadingMore: true });
        try {
          const response = await orderService.getOrders(nextPage, 20, undefined, undefined, search);
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
      version: 2,
      partialize: (state) => ({
        cart: state.cart,
        customerPhone: state.customerPhone,
        customerName: state.customerName,
        customerId: state.customerId
      }),
    }
  )
);
