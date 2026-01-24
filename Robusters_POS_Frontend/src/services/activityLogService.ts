import { apiClient } from '@/lib/api';

export interface ActivityLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  details: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ActivityLogsResponse {
  success: boolean;
  data: {
    logs: ActivityLog[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  };
}

export interface ActivityLogFilters {
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const activityLogService = {
  // Get all activity logs (Admin only)
  async getActivityLogs(filters: ActivityLogFilters = {}): Promise<ActivityLogsResponse> {
    const params = new URLSearchParams();

    if (filters.userId) params.append('userId', filters.userId);
    if (filters.action) params.append('action', filters.action);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const url = `/activity-logs${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ActivityLogsResponse>(url);
    return response.data;
  },

  // Get available action types (Admin only)
  async getActionTypes(): Promise<{ success: boolean; data: { actions: string[] } }> {
    const response = await apiClient.get<{ success: boolean; data: { actions: string[] } }>('/activity-logs/actions');
    return response.data;
  },
};
