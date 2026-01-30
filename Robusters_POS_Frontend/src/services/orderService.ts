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
}

export interface CreateOrderRequest {
  customerPhone?: string;
  customerName?: string;
  items: OrderItem[];
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'LOYALTY';
  notes?: string;
  locationId?: string;
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

export const orderService = {
  // Create new order
  async createOrder(orderData: CreateOrderRequest): Promise<CreateOrderResponse> {
    const response = await apiClient.post<CreateOrderResponse>('/orders', orderData);
    return response.data;
  },

  // Get all orders with pagination and filters
  async getOrders(
    page = 1,
    limit = 20,
    startDate?: string,
    endDate?: string
  ): Promise<OrdersResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get<OrdersResponse>(`/orders?${params.toString()}`);
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
};