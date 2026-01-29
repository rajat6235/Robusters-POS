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
  Phone, Mail, Calendar, ShoppingBag, 
  DollarSign, Award, History, Settings, Loader2
} from 'lucide-react';

interface CustomerProfileProps {
  customer: Customer;
  onClose?: () => void;
}

export function CustomerProfile({ customer, onClose }: CustomerProfileProps) {
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

  const tier = getCustomerTier(Number(customer.total_spent || 0));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Customer Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lg sm:text-2xl font-bold text-primary">
              {customer.first_name.charAt(0)}{customer.last_name?.charAt(0) || ''}
            </span>
          </div>
          
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold truncate">
              {customer.first_name} {customer.last_name || ''}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={tier.color}>{tier.name}</Badge>
              {Number(customer.total_orders || 0) > 10 && (
                <Badge variant="secondary">VIP Customer</Badge>
              )}
            </div>
          </div>
        </div>
        
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Close
        </Button>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Orders</p>
                <p className="text-lg sm:text-2xl font-bold">{Number(customer.total_orders || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Spent</p>
                <p className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(Number(customer.total_spent || 0))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Loyalty Points</p>
                <p className="text-lg sm:text-2xl font-bold">{customer.loyalty_points}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Avg Order Value</p>
                <p className="text-lg sm:text-2xl font-bold truncate">
                  {Number(customer.total_orders || 0) > 0 
                    ? formatCurrency(
                        Number(customer.total_spent || 0) / Number(customer.total_orders || 1)
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
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs sm:text-sm">Order History</TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs sm:text-sm">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-6 pt-0">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm sm:text-base break-all">{customer.phone}</span>
                </div>
                
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm sm:text-base break-all">{customer.email}</span>
                  </div>
                )}
                
                {customer.date_of_birth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm sm:text-base">Born {formatDate(customer.date_of_birth)}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm sm:text-base">Customer since {formatDate(customer.created_at)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Settings className="h-4 w-4" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-6 pt-0">
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
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <History className="h-4 w-4" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {isLoadingOrders ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
                  <span className="ml-2 text-sm sm:text-base">Loading orders...</span>
                </div>
              ) : orderHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm sm:text-base">No orders found</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] sm:h-[400px]">
                  <div className="space-y-3 sm:space-y-4">
                    {orderHistory.map((order) => (
                      <div
                        key={order.id}
                        className="border rounded-lg p-3 sm:p-4 space-y-3"
                      >
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm sm:text-base">Order #{order.order_number}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 sm:text-right">
                            <p className="font-bold text-sm sm:text-base">{formatCurrency(order.total)}</p>
                            <Badge variant="secondary" className="text-xs">
                              {order.payment_method}
                            </Badge>
                          </div>
                        </div>

                        {/* Order Items */}
                        {order.items && order.items.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Items:</p>
                            <div className="space-y-2">
                              {order.items.map((item: any, index: number) => (
                                <div key={item.id || index} className="bg-muted/50 rounded p-2 sm:p-3 space-y-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-medium text-sm truncate">{item.item_name || 'Unknown Item'}</span>
                                      {item.diet_type && (
                                        <Badge variant="outline" className="text-xs flex-shrink-0">
                                          {item.diet_type}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 sm:text-right">
                                      <span className="text-xs sm:text-sm">Qty: {item.quantity || 1}</span>
                                      <p className="font-medium text-sm">{formatCurrency(item.total_price)}</p>
                                    </div>
                                  </div>
                                  
                                  {/* Variants */}
                                  {item.variants && Array.isArray(item.variants) && item.variants.length > 0 && (
                                    <div className="text-xs sm:text-sm text-muted-foreground">
                                      <span className="font-medium">Variants: </span>
                                      {item.variants.map((variant: any, vIndex: number) => (
                                        <span key={vIndex}>
                                          {variant.name}
                                          {vIndex < item.variants.length - 1 ? ', ' : ''}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Addons */}
                                  {item.addons && Array.isArray(item.addons) && item.addons.length > 0 && (
                                    <div className="text-xs sm:text-sm text-muted-foreground">
                                      <span className="font-medium">Add-ons: </span>
                                      {item.addons.map((addon: any, aIndex: number) => (
                                        <span key={aIndex}>
                                          {addon.name}
                                          {aIndex < item.addons.length - 1 ? ', ' : ''}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Special Instructions */}
                                  {item.special_instructions && (
                                    <div className="text-xs sm:text-sm text-muted-foreground">
                                      <span className="font-medium">Special Request: </span>
                                      <span className="italic">{item.special_instructions}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Order Notes */}
                        {order.notes && (
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            <span className="font-medium">Order Notes: </span>
                            <span className="italic">{order.notes}</span>
                          </div>
                        )}
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
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Customer Preferences</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <p className="text-muted-foreground text-sm sm:text-base">
                Preference management coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}