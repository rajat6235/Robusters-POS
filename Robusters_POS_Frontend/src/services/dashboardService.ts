/**
 * Dashboard Service
 * Handles API calls for dashboard analytics and statistics.
 */

import { apiClient } from '@/lib/api';

export interface DashboardStats {
  todayStats: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    newCustomers: number;
  };
  trends: {
    orders: string;
    revenue: string;
    customers: string;
  };
  recentOrders: Array<{
    id: string;
    items: string;
    total: string;
    customerName: string;
    createdAt: string;
  }>;
  paymentMethodBreakdown: {
    [key: string]: number;
  };
}

export interface WeeklyAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  paymentMethodBreakdown: {
    [key: string]: number;
  };
  dailyStats: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

export interface TopCustomer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  total_orders: number;
  total_spent: number;
  loyalty_points: number;
}

export interface WeeklyTopCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  weeklyOrders: number;
  weeklySpent: number;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
}

export interface WeeklyTopCustomersResponse {
  customers: WeeklyTopCustomer[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get('/dashboard/stats');
  return response.data.data;
};

/**
 * Get weekly analytics
 */
export const getWeeklyAnalytics = async (): Promise<WeeklyAnalytics> => {
  const response = await apiClient.get('/dashboard/weekly');
  return response.data.data;
};

/**
 * Get top customers
 */
export const getTopCustomers = async (limit: number = 10): Promise<TopCustomer[]> => {
  const response = await apiClient.get(`/dashboard/top-customers?limit=${limit}`);
  return response.data.data;
};

/**
 * Get top customers of the week
 */
export const getTopCustomersOfWeek = async (limit: number = 5): Promise<WeeklyTopCustomersResponse> => {
  const response = await apiClient.get(`/dashboard/top-customers-week?limit=${limit}`);
  return response.data.data;
};