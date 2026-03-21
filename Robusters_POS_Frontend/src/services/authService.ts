import { apiClient } from '@/lib/api';
import { User, LoginCredentials } from '@/types';

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  message: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER';
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: 'ADMIN' | 'MANAGER';
}

export interface RegisterResponse {
  success: boolean;
  data: {
    user: User;
  };
  message: string;
}

export interface UsersResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (err: any): boolean => {
  // Network errors, timeouts, or 5xx from a cold/stale server — safe to retry
  if (!err.response) return true; // No response = network/timeout error
  const status = err.response?.status;
  return status === 502 || status === 503 || status === 504;
};

export const authService = {
  // Login user — retries up to 2 times on network/server errors (handles DB cold start)
  async login(credentials: LoginCredentials, attempt = 1): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials, {
        timeout: 15000, // 15s per attempt — enough for DB cold start
      });
      return response.data;
    } catch (err: any) {
      if (attempt < 3 && isRetryableError(err)) {
        await sleep(attempt * 500); // 500ms, 1000ms
        return authService.login(credentials, attempt + 1);
      }
      throw err;
    }
  },

  // Get current user profile
  async getProfile(): Promise<{ success: boolean; data: { user: User } }> {
    const response = await apiClient.get<{ success: boolean; data: { user: User } }>('/auth/me');
    return response.data;
  },

  // Register new user (Admin only)
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', userData);
    return response.data;
  },

  // Get all users (Admin only)
  async getAllUsers(page = 1, limit = 10): Promise<UsersResponse> {
    const response = await apiClient.get<UsersResponse>(`/auth/users?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Deactivate user (Admin only)
  async deactivateUser(userId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.patch<{ success: boolean; message: string }>(`/auth/users/${userId}/deactivate`);
    return response.data;
  },

  // Activate user (Admin only)
  async activateUser(userId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.patch<{ success: boolean; message: string }>(`/auth/users/${userId}/activate`);
    return response.data;
  },

  // Update user (Admin only)
  async updateUser(userId: string, userData: UpdateUserRequest): Promise<{ success: boolean; data: { user: User }; message: string }> {
    const response = await apiClient.put<{ success: boolean; data: { user: User }; message: string }>(`/auth/users/${userId}`, userData);
    return response.data;
  },

  // Logout user
  async logout(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/logout');
    return response.data;
  },
};