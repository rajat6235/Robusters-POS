'use client';

import React, { useState, useEffect } from 'react';
import { Customer, customerService } from '@/services/customerService';
import { useCustomerStore } from '@/hooks/useCustomerStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Phone, Mail, Calendar, MapPin, ShoppingBag, 
  DollarSign, Award, Edit, History, Settings, Loader2
} from 'lucide-react';

interface CustomerProfileProps {
  customer: Customer;
  onClose?: () => void;
}

export function CustomerProfile({ customer, onClose }: CustomerProfileProps) {
  const { updatePreferences } = useCustomerStore();
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrderHistory();
    }
  }, [activeTab, customer.id]);

  const loadOrderHistory = async () => {
    setIsLoadingOrders(true);
    try {
      const response = await customerService.getCustomerOrders(customer.id, 1, 10);
      setOrderHistory(response.data.orders);
    } catch (error) {
      toast.error('Failed to load order history');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${numAmount.toFixed(2)}`;
  };

  const getCustomerTier = (totalSpent: number | string) => {
    const spent = typeof totalSpent === 'string' ? parseFloat(totalSpent) : totalSpent;
    if (spent >= 10000) return { name: 'Platinum', color: 'bg-purple-500' };
    if (spent >= 5000) return { name: 'Gold', color: 'bg-yellow-500' };
    if (spent >= 2000) return { name: 'Silver', color: 'bg-gray-400' };
    return { name: 'Bronze', color: 'bg-orange-500' };
  };

  const tier = getCustomerTier(customer.total_spent);

  return (
    <div className="space-y-6">
      {/* Customer Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {customer.first_name.charAt(0)}{customer.last_name?.charAt(0) || ''}
            </span>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold">
              {customer.first_name} {customer.last_name || ''}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={tier.color}>{tier.name}</Badge>
              {customer.total_orders > 10 && (
                <Badge variant="secondary">VIP Customer</Badge>
              )}
            </div>
          </div>
        </div>
        
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{customer.total_orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">{formatCurrency(customer.total_spent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Loyalty Points</p>
                <p className="text-2xl font-bold">{customer.loyalty_points}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">
                  {customer.total_orders > 0 
                    ? formatCurrency(
                        (typeof customer.total_spent === 'string' 
                          ? parseFloat(customer.total_spent) 
                          : customer.total_spent) / customer.total_orders
                      )
                    : '₹0.00'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
                
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.email}</span>
                  </div>
                )}
                
                {customer.date_of_birth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Born {formatDate(customer.date_of_birth)}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Customer since {formatDate(customer.created_at)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.dietary_restrictions && customer.dietary_restrictions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Dietary Restrictions</p>
                    <div className="flex flex-wrap gap-1">
                      {customer.dietary_restrictions.map((restriction, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {restriction}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {customer.allergies && customer.allergies.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Allergies</p>
                    <div className="flex flex-wrap gap-1">
                      {customer.allergies.map((allergy, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {customer.preferred_payment_method && (
                  <div>
                    <p className="text-sm font-medium mb-1">Preferred Payment</p>
                    <Badge variant="secondary">{customer.preferred_payment_method}</Badge>
                  </div>
                )}
                
                {customer.preference_notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground">{customer.preference_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingOrders ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading orders...</span>
                </div>
              ) : orderHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No orders found</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {orderHistory.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">Order #{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(order.created_at)}
                          </p>
                          <Badge variant="secondary" className="mt-1">
                            {new Date(order.created_at).toLocaleDateString()}
                          </Badge>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(order.total)}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.payment_method}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Preference management coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}