import axios from 'axios';

// Use Next.js API routes as proxy (relative URL)
const API_BASE_URL = '/api';

// Create axios instance with auth interceptor
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('demo_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
