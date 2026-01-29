'use client';

import React, { useEffect, useState } from 'react';
import { User, AuthState, LoginCredentials } from '@/types';
import { authService } from '@/services/authService';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    
    if (token) {
      // Verify token and get user profile
      authService.getProfile()
        .then(response => {
          if (response.success) {
            setState({
              user: response.data.user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Invalid token, clear it
            localStorage.removeItem(TOKEN_KEY);
            setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
          }
        })
        .catch(() => {
          // Token invalid or network error
          localStorage.removeItem(TOKEN_KEY);
          setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
        });
    } else {
      setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await authService.login(credentials);
      
      if (response.success) {
        const { user, token } = response.data;
        
        // Store token
        localStorage.setItem(TOKEN_KEY, token);
        
        setState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true };
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Login failed' };
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Login failed';
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    // Call backend logout endpoint to log the activity
    try {
      await authService.logout();
    } catch (error) {
      // Silently fail - we still want to logout locally even if the server call fails
      console.error('Failed to log logout activity:', error);
    }

    localStorage.removeItem(TOKEN_KEY);
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const refreshUser = async () => {
    try {
      const response = await authService.getProfile();
      if (response.success) {
        setState(prev => ({
          ...prev,
          user: response.data.user,
        }));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
