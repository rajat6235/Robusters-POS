import { apiClient } from '@/lib/api';

export interface OrderItem {
  itemId?: string;
  item_id?: string; // Backend returns snake_case
  menu_item_id?: string; // Backend returns snake_case
  quantity: number;
  variantIds?: string[];
  variant_ids?: string[]; // Backend returns snake_case
  addonSelections?: {
    addonId: string;
    quantity: number;
  }[];
  addon_selections?: any; // Backend returns snake_case as JSON
  specialInstructions?: string;
  special_instructions?: string; // Backend returns snake_case
  customUnitPrice?: number; // Optional price override (sent in request)
  unitPrice?: number | string;
  unit_price?: number | string; // Backend returns snake_case
  totalPrice?: number | string;
  total_price?: number | string; // Backend returns snake_case
  item_name?: string; // Backend includes item name
  itemName?: string;
  // How many units of this line were redeemed against a meal package
  // (billed at ₹0) rather than charged normally.
  package_covered_quantity?: number;
}

export interface CreateOrderRequest {
  // Known customer id, when one was already resolved (e.g. from the
  // checkout customer-lookup step) — lets the backend resolve the exact
  // same customer record the meal-package preview was computed against,
  // rather than re-resolving by phone (see mealPackageFallback docs).
  customerId?: string;
  customerPhone?: string;
  customerName?: string;
  items: OrderItem[];
  paymentMethod: 'CASH' | 'CARD' | 'UPI';
  loyaltyPointsToRedeem?: number;
  notes?: string;
  locationId?: string;
  // false when the "use meal package" toggle is switched off for this
  // order — the order is charged in full instead of auto-redeeming.
  useMealPackage?: boolean;
}

export interface MealPackageRedemptionResult {
  packageId: string;
  packageName: string;
  mealsUsed: number;
  remainingMeals: number;
  totalSaved: number;
}

export interface MealPackagePreviewItemResult {
  itemId: string;
  name: string;
  variantIds: string[];
  quantity: number;
  unitPrice: number;
  coveredQty: number;
  chargedQty: number;
  covered: boolean;
}

export type MealPackagePreviewReason =
  | 'no_customer'
  | 'no_active_package'
  | 'expired'
  | 'exhausted'
  | 'no_matching_items'
  | 'declined'
  | null;

export interface MealPackagePreviewResponse {
  applied: boolean;
  reason: MealPackagePreviewReason;
  package: { id: string; name: string; remainingMeals: number } | null;
  items: MealPackagePreviewItemResult[];
  cartTotal: number;
  totalSaved: number;
  finalAmount: number;
  mealsWillBeUsed: number;
  remainingMealsAfter: number | null;
  // Populated when reason === 'declined' — what the package would have
  // saved had the "use meal package" toggle been left on.
  wouldHaveSaved?: number;
}

export interface MealPackagePreviewRequest {
  customerId?: string;
  items: Array<{
    itemId: string;
    quantity: number;
    variantIds?: string[];
    customUnitPrice?: number;
  }>;
  // false when the staff/customer has switched off the "use meal package"
  // toggle for this order — omit or true to redeem as normal.
  useMealPackage?: boolean;
}

export interface Order {
  id: string;
  orderNumber?: string;
  order_number?: string; // Backend returns snake_case
  customerPhone?: string;
  customer_phone?: string; // Backend returns snake_case
  customerName?: string;
  customer_name?: string; // Backend returns snake_case
  items: OrderItem[];
  subtotal: number | string; // Backend might return as string
  tax: number | string; // Backend might return as string
  total: number | string; // Backend might return as string
  paymentMethod?: 'CASH' | 'CARD' | 'UPI' | 'LOYALTY';
  payment_method?: 'CASH' | 'CARD' | 'UPI' | 'LOYALTY'; // Backend returns snake_case
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
  payment_status?: 'PENDING' | 'PAID' | 'FAILED'; // Backend returns snake_case
  status?: 'CONFIRMED' | 'CANCELLED';
  notes?: string;
  createdBy?: string;
  created_by?: string; // Backend returns snake_case
  createdAt?: string;
  created_at?: string; // Backend returns snake_case
  updatedAt?: string;
  updated_at?: string; // Backend returns snake_case
  locationId?: string;
  location_id?: string; // Backend returns snake_case
  locationName?: string;
  location_name?: string; // Backend returns snake_case
  first_name?: string; // Created-by user first name
  last_name?: string; // Created-by user last name
  // Cancellation fields
  cancellation_requested_by?: string;
  cancellation_requested_at?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  requester_first_name?: string;
  requester_last_name?: string;
  // Persisted meal-package redemption info (returned on later reads —
  // GET /orders, GET /orders/:id — not just the create response).
  is_package_order?: boolean;
  meals_consumed?: number;
  customer_package_id?: string;
  meal_package_name?: string;
  // Present when this order automatically redeemed items against the
  // customer's active meal package (see meal-package-preview / createOrder)
  mealPackageRedemption?: MealPackageRedemptionResult | null;
  // Present when a meal-package redemption was expected (per the preview)
  // but the package ran out or was deactivated by a concurrent order in the
  // moment between preview and checkout — the order was still placed, at
  // full price, instead of failing outright.
  mealPackageFallback?: { reason: string } | null;
}

export interface OrdersResponse {
  success: boolean;
  data: {
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface CreateOrderResponse {
  success: boolean;
  data: {
    order: Order;
  };
  message: string;
}

export interface CancellationRequest {
  id: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  total: number;
  cancellation_reason: string;
  cancellation_requested_at: string;
  requester_first_name: string;
  requester_last_name: string;
  creator_first_name?: string;
  creator_last_name?: string;
}

export interface StatusHistoryEntry {
  id: number;
  previous_status: string;
  new_status: string;
  reason?: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

export const orderService = {
  // Create new order. An idempotencyKey lets a network retry or accidental
  // double-submit of the same order be deduped server-side instead of
  // creating a duplicate order (and double-consuming a meal-package credit).
  async createOrder(orderData: CreateOrderRequest, idempotencyKey?: string): Promise<CreateOrderResponse> {
    const response = await apiClient.post<CreateOrderResponse>('/orders', orderData, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return response.data;
  },

  // Preview meal-package coverage for a cart, without creating an order —
  // the backend recomputes this exact same way at actual checkout, so this
  // is purely for display.
  async previewMealPackageCoverage(
    payload: MealPackagePreviewRequest
  ): Promise<MealPackagePreviewResponse> {
    const response = await apiClient.post<{ success: boolean; data: MealPackagePreviewResponse }>(
      '/orders/meal-package-preview',
      payload
    );
    return response.data.data;
  },

  // Get all orders with pagination and filters
  async getOrders(
    page = 1,
    limit = 20,
    startDate?: string,
    endDate?: string,
    search?: string,
    signal?: AbortSignal
  ): Promise<OrdersResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (search) params.append('search', search);

    const response = await apiClient.get<OrdersResponse>(`/orders?${params.toString()}`, { signal });
    return response.data;
  },

  // Get single order by ID
  async getOrder(orderId: string): Promise<{ success: boolean; data: { order: Order } }> {
    const response = await apiClient.get<{ success: boolean; data: { order: Order } }>(`/orders/${orderId}`);
    return response.data;
  },

  // Get order statistics
  async getOrderStats(
    startDate?: string,
    endDate?: string
  ): Promise<{
    success: boolean;
    data: {
      totalOrders: number;
      totalRevenue: number;
      averageOrderValue: number;
      paymentMethodBreakdown: Record<string, number>;
      dailyStats: {
        date: string;
        orders: number;
        revenue: number;
      }[];
    };
  }> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(`/orders/stats?${params.toString()}`);
    return response.data;
  },

  // Request order cancellation
  async requestCancellation(orderId: string, reason: string): Promise<{ success: boolean; data: { order: Order }; message: string }> {
    const response = await apiClient.post(`/orders/${orderId}/cancel-request`, { reason });
    return response.data;
  },

  // Approve or reject order cancellation
  async approveCancellation(
    orderId: string, 
    approved: boolean, 
    adminNotes?: string
  ): Promise<{ success: boolean; data: { order: Order }; message: string }> {
    const response = await apiClient.post(`/orders/${orderId}/cancel-approve`, { 
      approved, 
      adminNotes 
    });
    return response.data;
  },

  // Get pending cancellation requests
  async getCancellationRequests(): Promise<{ success: boolean; data: { requests: CancellationRequest[] } }> {
    const response = await apiClient.get('/orders/cancellation-requests');
    return response.data;
  },

  // Get order status history
  async getOrderStatusHistory(orderId: string): Promise<{ success: boolean; data: { history: StatusHistoryEntry[] } }> {
    const response = await apiClient.get(`/orders/${orderId}/status-history`);
    return response.data;
  },
};