'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { menuService } from '@/services/menuService';
import { toast } from 'sonner';

export default function TestApiPage() {
  const { user, login } = useAuth();
  const [menuData, setMenuData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  const testMenuAPI = async () => {
    setLoading(true);
    try {
      const response = await menuService.getPublicMenu();
      setMenuData(response);
      toast.success('Menu API working!');
    } catch (error: any) {
      console.error('Menu API Error:', error);
      toast.error(`Menu API Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testAuthAPI = async () => {
    setLoading(true);
    try {
      const result = await login(loginForm);
      if (result.success) {
        toast.success('Auth API working!');
      } else {
        toast.error(`Auth Error: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Auth API Error:', error);
      toast.error(`Auth API Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testHealthAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      console.log('Health API Response:', data);
      toast.success('Health API working!');
    } catch (error: any) {
      console.error('Health API Error:', error);
      toast.error(`Health API Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">API Integration Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Health API Test */}
        <Card>
          <CardHeader>
            <CardTitle>Health API</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testHealthAPI} disabled={loading}>
              Test Health API
            </Button>
          </CardContent>
        </Card>

        {/* Auth API Test */}
        <Card>
          <CardHeader>
            <CardTitle>Auth API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Email"
              value={loginForm.email}
              onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
            />
            <Input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
            />
            <Button onClick={testAuthAPI} disabled={loading}>
              Test Login API
            </Button>
            <div className="text-sm text-gray-600">
              Try: admin@robusters.com / Admin@123
            </div>
          </CardContent>
        </Card>

        {/* Menu API Test */}
        <Card>
          <CardHeader>
            <CardTitle>Menu API</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testMenuAPI} disabled={loading}>
              Test Menu API
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Current User */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Current User</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-4 rounded">
              {JSON.stringify(user, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Menu Data */}
      {menuData && (
        <Card>
          <CardHeader>
            <CardTitle>Menu Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <p>Categories: {menuData.categories?.length || 0}</p>
              <p>Total Items: {menuData.categories?.reduce((sum: number, cat: any) => sum + (cat.items?.length || 0), 0) || 0}</p>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">View Raw Data</summary>
              <pre className="text-xs bg-gray-100 p-4 rounded mt-2 max-h-96 overflow-auto">
                {JSON.stringify(menuData, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}