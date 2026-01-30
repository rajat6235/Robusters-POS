'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCustomerStore } from '@/hooks/useCustomerStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { Customer } from '@/services/customerService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search, Plus, Phone, Mail, Calendar, ShoppingBag,
  DollarSign, Award, Edit, Trash2, Eye, Loader2, ArrowDownUp
} from 'lucide-react';
import { CustomerForm } from '@/components/customer/CustomerForm';
import { CustomerProfile } from '@/components/customer/CustomerProfile';

export default function CustomersPage() {
  const {
    customers,
    selectedCustomer,
    isLoading,
    error,
    loadCustomers,
    setSelectedCustomer,
    deactivateCustomer,
    clearError
  } = useCustomerStore();

  const { vipThreshold, fetchPublicSettings } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'recent' | 'loyalty' | 'orders' | 'spent'>('recent');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // Load customers from API whenever search or sort changes
  useEffect(() => {
    loadCustomers(1, 20, debouncedSearch, sortBy);
  }, [loadCustomers, debouncedSearch, sortBy]);

  // Load settings
  useEffect(() => {
    fetchPublicSettings();
  }, [fetchPublicSettings]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleCreateCustomer = () => {
    setShowCreateDialog(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowProfileDialog(true);
  };

  const handleDeactivateCustomer = async (customer: Customer) => {
    if (window.confirm(`Are you sure you want to deactivate ${customer.first_name} ${customer.last_name || ''}?`)) {
      try {
        await deactivateCustomer(customer.id);
        toast.success('Customer deactivated successfully');
      } catch (error) {
        toast.error('Failed to deactivate customer');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isVipCustomer = (customer: Customer) => {
    const minOrders = vipThreshold?.min_orders || 10;
    return Number(customer.total_orders || 0) >= minOrders;
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${numAmount.toFixed(2)}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 px-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => loadCustomers(1, 20)}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Customers</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage customer profiles and view order history
          </p>
        </div>
        <Button onClick={handleCreateCustomer} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm sm:text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Customers</p>
                <p className="text-lg sm:text-2xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Revenue</p>
                <p className="text-lg sm:text-2xl font-bold truncate">
                  {formatCurrency(customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-purple-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Orders</p>
                <p className="text-lg sm:text-2xl font-bold">
                  {customers.reduce((sum, c) => sum + Number(c.total_orders || 0), 0)}
                </p>
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
                <p className="text-lg sm:text-2xl font-bold">
                  {customers.reduce((sum, c) => sum + c.loyalty_points, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">Customer List</CardTitle>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <ArrowDownUp className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="loyalty">Loyalty Points</SelectItem>
                <SelectItem value="orders">Most Orders</SelectItem>
                <SelectItem value="spent">Most Spent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
              <span className="ml-2 text-sm sm:text-base">Loading customers...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm sm:text-base">
                {searchQuery ? 'No customers found matching your search.' : 'No customers yet.'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] sm:h-[400px]">
              <div className="space-y-2 sm:space-y-3">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 gap-3 sm:gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="font-medium text-sm sm:text-base truncate">
                          {customer.first_name} {customer.last_name || ''}
                        </h3>
                        {isVipCustomer(customer) && (
                          <Badge variant="secondary" className="text-xs">VIP</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{customer.phone}</span>
                        </div>
                        
                        {customer.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <ShoppingBag className="h-3 w-3 flex-shrink-0" />
                          <span>{Number(customer.total_orders || 0)} orders</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 flex-shrink-0" />
                          <span>{formatCurrency(Number(customer.total_spent || 0))}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Award className="h-3 w-3 flex-shrink-0 text-yellow-500" />
                          <span>{Number(customer.loyalty_points || 0)} pts</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 justify-end sm:justify-start">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewCustomer(customer)}
                        className="h-8 w-8 sm:h-9 sm:w-9"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivateCustomer(customer)}
                        className="h-8 w-8 sm:h-9 sm:w-9"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Customer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSuccess={() => {
              setShowCreateDialog(false);
              toast.success('Customer created successfully');
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Customer Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Customer Profile</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <CustomerProfile
              customer={selectedCustomer}
              onClose={() => setShowProfileDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}