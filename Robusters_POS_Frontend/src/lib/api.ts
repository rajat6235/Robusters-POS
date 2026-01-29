import axios from 'axios';

// Call backend directly, bypassing the Next.js proxy to avoid undici timeout issues
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api';

// Create axios instance with auth interceptor
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors — skip redirect for login endpoint (401 is expected for bad credentials)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('demo_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
