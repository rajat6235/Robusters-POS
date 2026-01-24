import { apiClient } from '@/lib/api';

export interface OrderItem {
  itemId: string;
  quantity: number;
  variantIds?: string[];
  addonSelections?: {
    addonId: string;
    quantity: number;
  }[];
  specialInstructions?: string;
}

export interface CreateOrderRequest {
  customerPhone?: string;
  customerName?: string;
  items: OrderItem[];
  paymentMethod: 'CASH' | 'CARD' | 'UPI';
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerPhone?: string;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: 'CASH' | 'CARD' | 'UPI';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
    status?: Order['status'],
    startDate?: string,
    endDate?: string
  ): Promise<OrdersResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append('status', status);
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

  // Update order status
  async updateOrderStatus(
    orderId: string,
    status: Order['status']
  ): Promise<{ success: boolean; data: { order: Order }; message: string }> {
    const response = await apiClient.patch<{ success: boolean; data: { order: Order }; message: string }>(
      `/orders/${orderId}/status`,
      { status }
    );
    return response.data;
  },

  // Cancel order
  async cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.patch<{ success: boolean; message: string }>(
      `/orders/${orderId}/cancel`,
      { reason }
    );
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
      statusBreakdown: Record<Order['status'], number>;
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