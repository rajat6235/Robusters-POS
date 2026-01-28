'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore } from '@/hooks/useOrderStore';
import { Order } from '@/services/orderService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Eye,
  Loader2,
  Calendar,
  User,
  Phone,
  CreditCard,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const paymentMethodIcons = {
  CASH: '💵',
  CARD: '💳',
  UPI: '📱',
};

export default function OrdersPage() {
  const router = useRouter();
  const { orders, isLoading, error, loadOrders } = useOrderStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Load orders on mount
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    // Search filter
    const matchesSearch = !searchQuery || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone?.includes(searchQuery);

    // Date filter
    const orderDate = new Date(order.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = orderDate.toDateString() === today.toDateString();
    } else if (dateFilter === 'yesterday') {
      matchesDate = orderDate.toDateString() === yesterday.toDateString();
    } else if (dateFilter === 'week') {
      matchesDate = orderDate >= thisWeek;
    }

    return matchesSearch && matchesDate;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            Manage and track all orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => loadOrders()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button 
            onClick={() => router.push('/orders/new')}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Receipt className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-xl font-bold">{filteredOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">
                  ₹{filteredOrders.reduce((sum, o) => sum + o.total, 0).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number, customer name, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <p className="text-red-600">Error: {error}</p>
            <Button variant="outline" onClick={() => loadOrders()} className="mt-2">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || dateFilter !== 'all' 
                ? 'Try adjusting your filters or search terms'
                : 'No orders have been placed yet'
              }
            </p>
            {!searchQuery && dateFilter === 'all' && (
              <Button onClick={() => router.push('/orders/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">#{order.orderNumber}</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      {order.customerName && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{order.customerName}</span>
                        </div>
                      )}
                      {order.customerPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{order.customerPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{paymentMethodIcons[order.paymentMethod]}</span>
                        <span>{order.paymentMethod}</span>
                      </div>
                    </div>

                    {order.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        Note: {order.notes}
                      </p>
                    )}
                  </div>

                  {/* Order Total & Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold">₹{order.total.toFixed(0)}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Order #{selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="mt-1">{formatDate(selectedOrder.createdAt)}</p>
                </div>
              </div>

              {/* Customer Info */}
              {(selectedOrder.customerName || selectedOrder.customerPhone) && (
                <div>
                  <h4 className="font-medium mb-2">Customer</h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    {selectedOrder.customerName && (
                      <p className="font-medium">{selectedOrder.customerName}</p>
                    )}
                    {selectedOrder.customerPhone && (
                      <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h4 className="font-medium mb-3">Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-start bg-muted/50 rounded-lg p-3">
                      <div className="flex-1">
                        <p className="font-medium">Item #{index + 1}</p>
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        {item.specialInstructions && (
                          <p className="text-sm text-muted-foreground italic mt-1">
                            Note: {item.specialInstructions}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment & Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span>Subtotal</span>
                  <span>₹{selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span>Tax</span>
                  <span>₹{selectedOrder.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span>₹{selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span>Payment: {selectedOrder.paymentMethod}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}