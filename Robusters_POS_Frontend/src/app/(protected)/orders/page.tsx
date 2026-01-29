'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useLocationStore } from '@/hooks/useLocationStore';
import { Order } from '@/services/orderService';
import { Card, CardContent } from '@/components/ui/card';
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
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Utility function to safely convert string/number to number for price display
const safeParseFloat = (value: string | number | undefined | null): number => {
  if (value === null || value === undefined) return 0;
  return typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
};

const paymentMethodIcons = {
  CASH: '💵',
  CARD: '💳',
  UPI: '📱',
};

export default function OrdersPage() {
  const router = useRouter();
  const { orders, isLoading, error, loadOrders } = useOrderStore();
  
  const { locations, fetchLocations } = useLocationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Load orders and locations on mount
  useEffect(() => {
    loadOrders();
    fetchLocations();
  }, [loadOrders, fetchLocations]);

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    // Search filter - handle both camelCase and snake_case field names
    const orderNumber = order.orderNumber || order.order_number || '';
    const customerName = order.customerName || order.customer_name || '';
    const customerPhone = order.customerPhone || order.customer_phone || '';
    
    const matchesSearch = !searchQuery || 
      orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerPhone.includes(searchQuery);

    // Date filter - handle both camelCase and snake_case field names
    const createdAt = order.createdAt || order.created_at;
    const orderDate = new Date(createdAt);
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

    // Branch filter
    const orderLocationId = order.locationId || order.location_id || '';
    const matchesBranch = branchFilter === 'all' || orderLocationId === branchFilter;

    return matchesSearch && matchesDate && matchesBranch;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Invalid Date';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
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
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        {/* Summary stats skeleton */}
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-full sm:w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Order cards skeleton */}
        <div className="grid gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                  <div className="flex-1 space-y-3 w-full">
                    <Skeleton className="h-6 w-28" />
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-16 w-full rounded-md" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
                  ₹{filteredOrders.reduce((sum, o) => sum + safeParseFloat(o.total), 0).toFixed(0)}
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

            {/* Branch Filter */}
            {locations.length > 0 && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <MapPin className="h-4 w-4 mr-1 shrink-0" />
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {locations.filter(l => l.is_active).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
          <CardContent className="p-6 sm:p-8 text-center">
            <Receipt className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              {searchQuery || dateFilter !== 'all' || branchFilter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'No orders have been placed yet'
              }
            </p>
            {!searchQuery && dateFilter === 'all' && branchFilter === 'all' && (
              <Button onClick={() => router.push('/orders/new')} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create First Order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {filteredOrders.map((order) => {
            // Handle both camelCase and snake_case field names
            const orderNumber = order.orderNumber || order.order_number || 'N/A';
            const customerName = order.customerName || order.customer_name;
            const customerPhone = order.customerPhone || order.customer_phone;
            const createdAt = order.createdAt || order.created_at;
            const paymentMethod = order.paymentMethod || order.payment_method || 'CASH';
            const total = order.total || 0;
            const items = order.items || [];
            const notes = order.notes;
            const locationName = order.locationName || order.location_name;
            const createdByName = [order.first_name, order.last_name].filter(Boolean).join(' ') || null;
            
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="font-semibold text-base sm:text-lg">#{orderNumber}</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-muted-foreground mb-3">
                        {customerName && (
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{customerName}</span>
                          </div>
                        )}
                        {customerPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{customerPhone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>{formatDate(createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{paymentMethodIcons[paymentMethod] || '💵'}</span>
                          <span>{paymentMethod}</span>
                        </div>
                        {(locationName || createdByName) && (
                          <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                            {locationName && (
                              <>
                                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="truncate">{locationName}</span>
                              </>
                            )}
                            {locationName && createdByName && (
                              <span className="text-muted-foreground/50">|</span>
                            )}
                            {createdByName && (
                              <span className="truncate text-xs">by {createdByName}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Order Items Details */}
                      {items && items.length > 0 && (
                        <div className="space-y-2 mb-3">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground">Items:</p>
                          <div className="space-y-2">
                            {items.map((item: any, itemIndex: number) => (
                              <div key={item.id || itemIndex} className="bg-muted/30 rounded-md p-2 text-xs sm:text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-medium truncate">
                                      {item.item_name || item.itemName || `Item #${itemIndex + 1}`}
                                    </span>
                                    {item.diet_type && (
                                      <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                                        {item.diet_type}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span>Qty: {item.quantity || 1}</span>
                                    <span className="font-medium">
                                      ₹{safeParseFloat(item.total_price || item.totalPrice).toFixed(0)}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Variants and Unit Price */}
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  {item.variants && Array.isArray(item.variants) && item.variants.length > 0 && (
                                    <span>
                                      Variants: {item.variants.map((v: any) => v.name).join(', ')}
                                    </span>
                                  )}
                                  <span>
                                    Unit Price: ₹{safeParseFloat(item.unit_price || item.unitPrice).toFixed(0)}
                                  </span>
                                </div>
                                
                                {/* Addons */}
                                {item.addons && Array.isArray(item.addons) && item.addons.length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Add-ons: {item.addons.map((a: any) => a.name).join(', ')}
                                  </div>
                                )}
                                
                                {/* Special Instructions */}
                                {(item.special_instructions || item.specialInstructions) && (
                                  <div className="text-xs text-muted-foreground mt-1 italic">
                                    Note: {item.special_instructions || item.specialInstructions}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {notes && (
                        <p className="text-xs sm:text-sm text-muted-foreground italic">
                          Order Note: {notes}
                        </p>
                      )}
                    </div>

                    {/* Order Total & Actions */}
                    <div className="flex flex-col items-end gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="text-right">
                        <p className="text-xl sm:text-2xl font-bold">₹{safeParseFloat(total).toFixed(0)}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {items.length || 0} item{items.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Order #{selectedOrder?.orderNumber || selectedOrder?.order_number || 'N/A'}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (() => {
            const detailLocationName = selectedOrder.locationName || selectedOrder.location_name;
            const detailCreatedByName = [selectedOrder.first_name, selectedOrder.last_name].filter(Boolean).join(' ') || null;
            return (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="mt-1">{formatDate(selectedOrder.createdAt || selectedOrder.created_at)}</p>
                </div>
                {detailLocationName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Branch</label>
                    <p className="mt-1 flex items-center gap-1.5"><MapPin className="h-4 w-4" />{detailLocationName}</p>
                  </div>
                )}
                {detailCreatedByName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created By</label>
                    <p className="mt-1">{detailCreatedByName}</p>
                  </div>
                )}
              </div>

              {/* Customer Info */}
              {((selectedOrder.customerName || selectedOrder.customer_name) || 
                (selectedOrder.customerPhone || selectedOrder.customer_phone)) && (
                <div>
                  <h4 className="font-medium mb-2">Customer</h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    {(selectedOrder.customerName || selectedOrder.customer_name) && (
                      <p className="font-medium">{selectedOrder.customerName || selectedOrder.customer_name}</p>
                    )}
                    {(selectedOrder.customerPhone || selectedOrder.customer_phone) && (
                      <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone || selectedOrder.customer_phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h4 className="font-medium mb-3">Items</h4>
                <div className="space-y-3">
                  {(selectedOrder.items || []).map((item: any, index: number) => (
                    <div key={item.id || index} className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm sm:text-base">
                            {item.item_name || item.itemName || `Item #${index + 1}`}
                          </span>
                          {item.diet_type && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {item.diet_type}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:text-right">
                          <span className="text-xs sm:text-sm">Qty: {item.quantity || 1}</span>
                          <p className="font-medium text-sm sm:text-base">
                            ₹{safeParseFloat(
                              item.total_price || 
                              item.totalPrice || 
                              (safeParseFloat(item.unit_price || item.unitPrice) * (item.quantity || 1))
                            ).toFixed(2)}
                          </p>
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
                      {(item.specialInstructions || item.special_instructions) && (
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          <span className="font-medium">Special Request: </span>
                          <span className="italic">{item.specialInstructions || item.special_instructions}</span>
                        </div>
                      )}
                      
                      {/* Unit Price */}
                      <div className="text-xs text-muted-foreground">
                        Unit Price: ₹{safeParseFloat(item.unit_price || item.unitPrice).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment & Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span>Subtotal</span>
                  <span>₹{safeParseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                {safeParseFloat(selectedOrder.tax) > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span>Tax</span>
                    <span>₹{safeParseFloat(selectedOrder.tax).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span>₹{safeParseFloat(selectedOrder.total).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span>Payment: {selectedOrder.paymentMethod || selectedOrder.payment_method || 'CASH'}</span>
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
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}