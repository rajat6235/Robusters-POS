/**
 * Dashboard Hook
 * Custom hook for managing dashboard data and state.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getDashboardStats, 
  getWeeklyAnalytics, 
  getTopCustomers,
  getTopCustomersOfWeek,
  DashboardStats,
  WeeklyAnalytics,
  TopCustomer,
  WeeklyTopCustomersResponse
} from '@/services/dashboardService';

interface UseDashboardReturn {
  stats: DashboardStats | null;
  weeklyAnalytics: WeeklyAnalytics | null;
  topCustomers: TopCustomer[];
  weeklyTopCustomers: WeeklyTopCustomersResponse | null;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
  refreshWeeklyAnalytics: () => Promise<void>;
  refreshTopCustomers: () => Promise<void>;
  refreshWeeklyTopCustomers: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useDashboard = (): UseDashboardReturn => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyAnalytics, setWeeklyAnalytics] = useState<WeeklyAnalytics | null>(null);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [weeklyTopCustomers, setWeeklyTopCustomers] = useState<WeeklyTopCustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      setError(null);
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    }
  }, []);

  const refreshWeeklyAnalytics = useCallback(async () => {
    try {
      setError(null);
      const data = await getWeeklyAnalytics();
      setWeeklyAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch weekly analytics:', err);
      setError('Failed to load weekly analytics');
    }
  }, []);

  const refreshTopCustomers = useCallback(async () => {
    try {
      setError(null);
      const data = await getTopCustomers(5);
      setTopCustomers(data);
    } catch (err) {
      console.error('Failed to fetch top customers:', err);
      setError('Failed to load top customers');
    }
  }, []);

  const refreshWeeklyTopCustomers = useCallback(async () => {
    try {
      setError(null);
      const data = await getTopCustomersOfWeek(5);
      setWeeklyTopCustomers(data);
    } catch (err) {
      console.error('Failed to fetch weekly top customers:', err);
      setError('Failed to load weekly top customers');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        refreshStats(),
        refreshWeeklyAnalytics(),
        refreshTopCustomers(),
        refreshWeeklyTopCustomers()
      ]);
    } finally {
      setLoading(false);
    }
  }, [refreshStats, refreshWeeklyAnalytics, refreshTopCustomers, refreshWeeklyTopCustomers]);

  useEffect(() => {
    refreshAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    stats,
    weeklyAnalytics,
    topCustomers,
    weeklyTopCustomers,
    loading,
    error,
    refreshStats,
    refreshWeeklyAnalytics,
    refreshTopCustomers,
    refreshWeeklyTopCustomers,
    refreshAll
  };
};