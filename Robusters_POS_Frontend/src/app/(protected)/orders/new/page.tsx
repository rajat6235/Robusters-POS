'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMenuStore } from '@/hooks/useMenuStore';
import { useOrderStore, calcItemUnitPrice } from '@/hooks/useOrderStore';
import { useLocationStore } from '@/hooks/useLocationStore';
import { customerService, Customer } from '@/services/customerService';
import { menuService } from '@/services/menuService';
import { CustomerForm } from '@/components/customer/CustomerForm';
import { MenuItem, Variant, Addon, DietType } from '@/types/menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ShoppingCart, Plus, Minus, Trash2, Search, Check, Loader2,
  User, ArrowLeft, UserPlus, SkipForward, Receipt,
  Star, CreditCard, ChevronUp, MapPin, Pencil, X, Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';

const dietColors: Record<DietType, string> = {
  veg: 'bg-green-500',
  'non-veg': 'bg-red-500',
  vegan: 'bg-emerald-400',
  egg: 'bg-yellow-500',
};

type OrderStep = 'customer' | 'menu';

/** Display price for a menu item card (min variant price or basePrice) */
function itemDisplayPrice(item: MenuItem): number {
  if (item.hasVariants && item.variants?.length > 0) {
    return Math.min(...item.variants.map(v => v.price));
  }
  return item.basePrice;
}

/** Calculate dynamic price for dialog based on selections */
function dialogPrice(
  item: MenuItem,
  selectedVariants: Variant[],
  selectedAddons: { addon: Addon; quantity: number }[],
  qty: number
): number {
  const variantTotal = selectedVariants.reduce((sum, v) => sum + v.price, 0);
  const addonTotal = selectedAddons.reduce((sum, s) => sum + s.addon.price * s.quantity, 0);
  return (item.basePrice + variantTotal + addonTotal) * qty;
}

// ─── Customer Lookup Step ──────────────────────────────────────────────

interface CustomerLookupProps {
  onCustomerSelected: (customer: Customer) => void;
  onSkip: () => void;
}

function CustomerLookupStep({ onCustomerSelected, onSkip }: CustomerLookupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const handleSearch = async () => {
    const raw = searchQuery.trim();
    if (!raw || raw.length < 2) {
      toast.error('Enter at least 2 characters to search');
      return;
    }
    setSearching(true);
    setSearched(false);
    setResults([]);
    setSelectedCustomer(null);
    setRecentOrders([]);
    setShowAddForm(false);

    try {
      const response = await customerService.searchCustomers(raw);
      const customers = response.data.customers || [];
      setResults(customers);
      setSearched(true);

      // If only one result, auto-select it
      if (customers.length === 1) {
        handleSelectCustomer(customers[0]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoadingOrders(true);
    try {
      const ordersRes = await customerService.getCustomerOrders(customer.id, 1, 5);
      setRecentOrders(ordersRes.data.orders || []);
    } catch {
      // Non-critical
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleCustomerCreated = async () => {
    setShowAddForm(false);
    if (searchQuery.trim()) {
      await handleSearch();
    }
    toast.success('Customer created successfully');
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">New Order</h1>
          <p className="text-muted-foreground">Search by customer name or phone number</p>
        </div>

        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-12 text-lg"
            autoFocus
          />
          <Button onClick={handleSearch} disabled={searching} className="h-12 px-6">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Multiple Results List */}
        {searched && results.length > 1 && !selectedCustomer && (
          <Card>
            <CardContent className="pt-4 space-y-1">
              <p className="text-sm text-muted-foreground mb-3">{results.length} customers found</p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {results.map((cust) => (
                  <button
                    key={cust.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                    onClick={() => handleSelectCustomer(cust)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {cust.first_name} {cust.last_name || ''}
                      </p>
                      <p className="text-xs text-muted-foreground">{cust.phone}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{Number(cust.total_orders || 0)} orders</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selected Customer Detail */}
        {selectedCustomer && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {selectedCustomer.first_name} {selectedCustomer.last_name || ''}
                  </h3>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                </div>
                {results.length > 1 && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedCustomer(null)}>
                    Back
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-lg font-bold">{Number(selectedCustomer.total_orders || 0)}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-lg font-bold">
                    ₹{Number(selectedCustomer.total_spent || 0).toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Spent</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-lg font-bold flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {selectedCustomer.loyalty_points}
                  </p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
              </div>

              {/* Recent Orders */}
              {loadingOrders ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading orders...</span>
                </div>
              ) : recentOrders.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium mb-3">Recent Orders</h4>
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {recentOrders.map((order: any) => (
                      <div key={order.id} className="border rounded-lg p-3 space-y-3">
                        {/* Order Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">#{order.order_number || order.id?.slice(-6)}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-sm">₹{Number(order.total || 0).toFixed(0)}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {order.payment_method}
                            </span>
                          </div>
                        </div>

                        {/* Order Items */}
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Items:</p>
                            <div className="space-y-2">
                              {order.items.map((item: any, index: number) => (
                                <div key={item.id || index} className="bg-muted/30 rounded p-2 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-xs">{item.item_name || 'Unknown Item'}</span>
                                      {item.diet_type && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                          item.diet_type === 'VEG' ? 'bg-green-100 text-green-700' :
                                          item.diet_type === 'NON_VEG' ? 'bg-red-100 text-red-700' :
                                          'bg-blue-100 text-blue-700'
                                        }`}>
                                          {item.diet_type}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs">Qty: {item.quantity || 1}</span>
                                      <p className="font-medium text-xs">₹{Number(item.total_price || 0).toFixed(0)}</p>
                                    </div>
                                  </div>

                                  {/* Variants */}
                                  {item.variants && Array.isArray(item.variants) && item.variants.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
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
                                    <div className="text-xs text-muted-foreground">
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
                                    <div className="text-xs text-muted-foreground">
                                      <span className="font-medium">Special Request: </span>
                                      <span className="italic">{item.special_instructions}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground italic">
                            Order details not available
                          </div>
                        )}

                        {/* Order Notes */}
                        {order.notes && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Order Notes: </span>
                            <span className="italic">{order.notes}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <Button className="w-full h-12 text-base" onClick={() => onCustomerSelected(selectedCustomer)}>
                Start Order
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {searched && results.length === 0 && !showAddForm && (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">No customers found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  No customer matches &ldquo;{searchQuery.trim()}&rdquo;
                </p>
              </div>
              <Button onClick={() => setShowAddForm(true)} className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Customer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Customer Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerForm
                onSuccess={handleCustomerCreated}
                onCancel={() => setShowAddForm(false)}
              />
            </CardContent>
          </Card>
        )}

        {/* Skip Button */}
        <div className="text-center">
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
            <SkipForward className="h-4 w-4 mr-2" />
            Skip — Continue without customer
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Menu / Cart Step ─────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter();
  const { categories, isLoading: menuLoading, loadMenu } = useMenuStore();
  const {
    cart,
    addToCart,
    updateCartItem,
    removeFromCart,
    getCartSubtotal,
    getCartTotal,
    createOrder,
    setCustomerInfo,
    clearCustomerInfo,
    clearCart,
    isLoading: orderLoading
  } = useOrderStore();

  const [step, setStep] = useState<OrderStep>('customer');
  const [orderCustomer, setOrderCustomer] = useState<Customer | null>(null);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingMenu, setIsSearchingMenu] = useState(false);
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Variant[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<{ addon: Addon; quantity: number }[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'LOYALTY'>('CASH');
  const [orderNotes, setOrderNotes] = useState('');

  // Location
  const { locations, selectedLocationId } = useLocationStore();
  const activeLocations = locations.filter(l => l.is_active);
  const [checkoutLocationId, setCheckoutLocationId] = useState<string | null>(null);

  // Checkout price overrides
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');

  // Load menu data on mount
  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  // Note: No longer auto-selecting first category since we show all categories

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Perform backend search
  useEffect(() => {
    const performSearch = async () => {
      const trimmed = debouncedSearch.trim();

      if (!trimmed || trimmed.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearchingMenu(true);
      try {
        const response = await menuService.searchMenuItems(trimmed);
        setSearchResults(response.items);
      } catch (error: any) {
        toast.error(error.message || 'Search failed');
        setSearchResults([]);
      } finally {
        setIsSearchingMenu(false);
      }
    };

    performSearch();
  }, [debouncedSearch]);

  // Cart totals (sync, no tax)
  const cartSubtotal = useMemo(() => getCartSubtotal(), [cart, getCartSubtotal]);
  const cartTotal = useMemo(() => getCartTotal(), [cart, getCartTotal]);

  // Determine if we're in search mode
  const isSearchMode = searchQuery.trim().length >= 2;

  // Filter categories to show available items
  const availableCategories = useMemo(() => {
    if (!categories) return [];
    return categories.map(cat => ({
      ...cat,
      items: cat.items?.filter(item => item.isAvailable) || []
    })).filter(cat => cat.items.length > 0); // Only show categories with available items
  }, [categories]);

  const handleCustomerSelected = (customer: Customer) => {
    setOrderCustomer(customer);
    setCustomerInfo(
      customer.phone,
      `${customer.first_name} ${customer.last_name || ''}`.trim(),
      customer.id
    );
    setStep('menu');
  };

  const handleSkipCustomer = () => {
    setOrderCustomer(null);
    clearCustomerInfo();
    setStep('menu');
  };

  const handleChangeCustomer = () => {
    setStep('customer');
  };

  const handleCategorySelect = (categoryId: string) => {
    // Normalize "all" to empty string for consistency
    const normalizedId = categoryId === 'all' ? '' : categoryId;
    setSelectedCategory(normalizedId);

    // If "all" is selected, just clear search if needed - don't scroll
    if (categoryId === 'all') {
      if (isSearchMode) {
        setSearchQuery('');
        setSearchResults([]);
        setDebouncedSearch('');
      }
      return;
    }

    // If in search mode, clear search first
    if (isSearchMode) {
      setSearchQuery('');
      setSearchResults([]);
      setDebouncedSearch('');
      // Wait for next tick to scroll after search is cleared
      setTimeout(() => {
        const categoryElement = categoryRefs.current[normalizedId];
        if (categoryElement) {
          categoryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // Scroll to category section immediately
      const categoryElement = categoryRefs.current[normalizedId];
      if (categoryElement) {
        categoryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedVariants([]);
    setQuantity(1);
    setSelectedAddons([]);
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    addToCart(selectedItem, selectedVariants, quantity, selectedAddons);
    toast.success(`${selectedItem.name} added to cart`);
    setSelectedItem(null);
    setSelectedVariants([]);
    setQuantity(1);
    setSelectedAddons([]);
  };

  const toggleAddon = (addon: Addon) => {
    const existing = selectedAddons.find((a) => a.addon.id === addon.id);
    if (existing) {
      setSelectedAddons(selectedAddons.filter((a) => a.addon.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, { addon, quantity: 1 }]);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setCheckoutLocationId(selectedLocationId);
    setPriceOverrides({});
    setEditingPriceId(null);
    setShowCheckout(true);
  };

  const getCheckoutTotal = () => {
    return cart.reduce((sum, item) => {
      const unitPrice = priceOverrides[item.id] !== undefined
        ? priceOverrides[item.id]
        : calcItemUnitPrice(item);
      return sum + unitPrice * item.quantity;
    }, 0);
  };

  const handlePlaceOrder = async () => {
    try {
      const overrides = Object.keys(priceOverrides).length > 0 ? priceOverrides : undefined;
      await createOrder(paymentMethod, orderNotes || undefined, checkoutLocationId || undefined, overrides);
      toast.success('Order placed successfully!');
      setShowCheckout(false);
      setShowCart(false);
      setPaymentMethod('CASH');
      setOrderNotes('');
      setCheckoutLocationId(null);
      setPriceOverrides({});
      setOrderCustomer(null);
      setStep('customer');

      // Navigate to orders page
      router.push('/orders');
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
    }
  };

  // ─── Customer Step ────────────────────────────────────────────

  if (step === 'customer') {
    return (
      <CustomerLookupStep
        onCustomerSelected={handleCustomerSelected}
        onSkip={handleSkipCustomer}
      />
    );
  }

  // ─── Menu Step ────────────────────────────────────────────────

  if (menuLoading && (!categories || categories.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading menu...</span>
      </div>
    );
  }

  // Dynamic price in dialog
  const currentDialogPrice = selectedItem
    ? dialogPrice(selectedItem, selectedVariants, selectedAddons, quantity)
    : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Customer bar */}
      <div className="shrink-0 flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 mx-1 mb-3">
        {orderCustomer ? (
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">
              {orderCustomer.first_name} {orderCustomer.last_name || ''}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">{orderCustomer.phone}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Walk-in customer</p>
        )}
        <Button variant="ghost" size="sm" className="shrink-0 text-xs h-7" onClick={handleChangeCustomer}>
          {orderCustomer ? 'Change' : 'Add Customer'}
        </Button>
      </div>

      {/* Search */}
      <div className="shrink-0 px-1 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-10"
          />
          {isSearchingMenu && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Category Navigation - Dropdown on mobile, Tabs on larger screens */}
      <div className="shrink-0 sticky top-0 bg-background/95 backdrop-blur-sm z-20 px-1 py-2 mb-3 border-b">
        {/* Mobile: Dropdown Select */}
        <div className="sm:hidden">
          <Select value={selectedCategory || "all"} onValueChange={handleCategorySelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Category">
                {selectedCategory && selectedCategory !== "all"
                  ? categories?.find(c => c.id === selectedCategory)?.name || "All Categories"
                  : "All Categories"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tablet/Desktop: Tab Buttons */}
        <div className="hidden sm:flex flex-wrap gap-2">
          <button
            onClick={() => handleCategorySelect('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              !selectedCategory || selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:shadow-sm'
            )}
          >
            All
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:shadow-sm'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items - All Categories or Search Results */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 pb-2">
        {isSearchMode ? (
          /* Search Results View */
          <>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground px-1">
                Search Results ({searchResults.length})
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 w-full">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  className="text-left bg-card border rounded-lg p-3 hover:shadow-md transition-shadow active:scale-[0.98] min-w-0"
                  onClick={() => handleSelectItem(item)}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <div className={cn('h-2.5 w-2.5 rounded-full mt-1 shrink-0', dietColors[item.dietType])} />
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">{item.name}</h3>
                  </div>
                  <p className="text-primary font-bold text-sm">
                    {item.hasVariants && item.variants?.length > 0 ? (
                      <>₹{itemDisplayPrice(item)}<span className="text-xs font-normal text-muted-foreground ml-1">+</span></>
                    ) : (
                      <>₹{item.basePrice}</>
                    )}
                  </p>
                </button>
              ))}
            </div>
            {searchResults.length === 0 && (
              <p className="text-center text-muted-foreground py-12">No items found</p>
            )}
          </>
        ) : (
          /* All Categories View */
          <div className="space-y-6">
            {availableCategories.map((category) => (
              <div
                key={category.id}
                ref={(el) => { categoryRefs.current[category.id] = el; }}
                className="scroll-mt-4"
              >
                {/* Category Header */}
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-2 mb-3">
                  <h2 className="text-lg font-bold text-foreground px-1 border-b-2 border-primary pb-1">
                    {category.name}
                  </h2>
                  {category.description && (
                    <p className="text-xs text-muted-foreground px-1 mt-1">{category.description}</p>
                  )}
                </div>

                {/* Category Items Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 w-full">
                  {category.items.map((item) => (
                    <button
                      key={item.id}
                      className="text-left bg-card border rounded-lg p-3 hover:shadow-md transition-shadow active:scale-[0.98] min-w-0"
                      onClick={() => handleSelectItem(item)}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <div className={cn('h-2.5 w-2.5 rounded-full mt-1 shrink-0', dietColors[item.dietType])} />
                        <h3 className="font-medium text-sm leading-tight line-clamp-2">{item.name}</h3>
                      </div>
                      <p className="text-primary font-bold text-sm">
                        {item.hasVariants && item.variants?.length > 0 ? (
                          <>₹{itemDisplayPrice(item)}<span className="text-xs font-normal text-muted-foreground ml-1">+</span></>
                        ) : (
                          <>₹{item.basePrice}</>
                        )}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {availableCategories.length === 0 && (
              <p className="text-center text-muted-foreground py-12">No menu items available</p>
            )}
          </div>
        )}
      </div>

      {/* Sticky Cart Bar at bottom */}
      {cart.length > 0 && (
        <div className="shrink-0 border-t bg-card px-3 py-2 safe-area-inset">
          {/* Expandable cart items */}
          {showCart && (
            <div className="max-h-60 overflow-y-auto mb-3 space-y-2 pt-2">
              {cart.map((item) => {
                const unitPrice = calcItemUnitPrice(item);
                return (
                  <div key={item.id} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.menuItem.name}</p>
                      {item.selectedVariants.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.selectedVariants.map(v => v.name).join(', ')}
                        </p>
                      )}
                      {item.addonSelections.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          + {item.addonSelections.map(a => a.addon.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateCartItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-5 text-center text-xs">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateCartItem(item.id, { quantity: item.quantity + 1 })}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm font-bold shrink-0 w-16 text-right">₹{(unitPrice * item.quantity).toFixed(0)}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFromCart(item.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cart summary bar */}
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 flex-1 min-w-0"
              onClick={() => setShowCart(!showCart)}
            >
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {cart.length}
                </span>
              </div>
              <span className="font-bold text-lg">₹{cartTotal.toFixed(0)}</span>
              <ChevronUp className={cn('h-4 w-4 text-muted-foreground transition-transform', showCart && 'rotate-180')} />
            </button>
            <Button className="h-10 px-6" onClick={handleCheckout} disabled={orderLoading}>
              {orderLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Place Order
            </Button>
          </div>
        </div>
      )}

      {/* Item Selection Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={cn('h-3 w-3 rounded-full', selectedItem && dietColors[selectedItem.dietType])} />
              {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* Dynamic Price */}
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">₹{currentDialogPrice.toFixed(0)}</p>
                {selectedItem.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedItem.description}</p>
                )}
              </div>

              {/* Variants */}
              {selectedItem.variants && selectedItem.variants.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Variants</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.variants.map((variant) => {
                      const isSelected = selectedVariants.some(v => v.id === variant.id);
                      return (
                        <Button
                          key={variant.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            const newVariants = isSelected
                              ? selectedVariants.filter(v => v.id !== variant.id)
                              : [...selectedVariants, variant];
                            setSelectedVariants(newVariants);
                            setQuantity(Math.max(1, newVariants.length));
                          }}
                        >
                          {variant.name} — ₹{variant.price}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add-ons */}
              {selectedItem.addons && selectedItem.addons.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">Add-ons (Optional)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {selectedItem.addons.map((addon) => {
                      const isSelected = selectedAddons.some((a) => a.addon.id === addon.id);
                      return (
                        <button
                          key={addon.id}
                          onClick={() => toggleAddon(addon)}
                          className={cn(
                            'relative flex items-start gap-2 p-3 rounded-lg border-2 text-left transition-all min-h-[60px]',
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                          )}
                        >
                          {/* Checkbox indicator */}
                          <div className={cn(
                            'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5',
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                          )}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-tight break-words">
                              {addon.name}
                            </p>
                            <p className="text-primary font-bold text-sm mt-1">
                              +₹{addon.price}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Quantity</p>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-bold">{quantity}</span>
                  <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button 
                className="w-full h-12" 
                onClick={handleAddToCart}
                disabled={
                  // Disable if item has variants but none selected
                  selectedItem?.variants && selectedItem.variants.length > 0 && selectedVariants.length === 0
                }
              >
                {selectedItem?.variants && selectedItem.variants.length > 0 && selectedVariants.length === 0 
                  ? "Select a variant to continue"
                  : `Add to Cart — ₹${currentDialogPrice.toFixed(0)}`
                }
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Checkout
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Customer Info Summary */}
            {orderCustomer ? (
              <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">
                    {orderCustomer.first_name} {orderCustomer.last_name || ''}
                  </p>
                  <p className="text-sm text-muted-foreground">{orderCustomer.phone}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">Walk-in customer (no customer linked)</p>
            )}

            {/* Location Picker */}
            {activeLocations.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </label>
                <Select
                  value={checkoutLocationId || ''}
                  onValueChange={(value) => setCheckoutLocationId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <div className="flex gap-2 flex-wrap">
                {(['CASH', 'CARD', 'UPI'] as const).map(method => (
                  <Button
                    key={method}
                    variant={paymentMethod === method ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPaymentMethod(method)}
                  >
                    {method === 'CASH' && <CreditCard className="h-3 w-3 mr-1" />}
                    {method}
                  </Button>
                ))}
              </div>
              {/* Loyalty Points Payment - only if customer has enough points */}
              {orderCustomer && (() => {
                const loyaltyPoints = Number(orderCustomer.loyalty_points || 0);
                const checkoutTotal = getCheckoutTotal();
                const canUseLoyalty = loyaltyPoints >= checkoutTotal && checkoutTotal > 0;
                return (
                  <Button
                    variant={paymentMethod === 'LOYALTY' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    disabled={!canUseLoyalty}
                    onClick={() => setPaymentMethod('LOYALTY')}
                  >
                    <Gift className="h-3 w-3 mr-1" />
                    Loyalty Points ({loyaltyPoints} pts)
                    {!canUseLoyalty && loyaltyPoints > 0 && (
                      <span className="text-xs ml-1 opacity-70">— not enough</span>
                    )}
                  </Button>
                );
              })()}
            </div>

            {/* Order Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                placeholder="Any special instructions..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              />
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4 space-y-3">
              {cart.map((item) => {
                const calculatedUnitPrice = calcItemUnitPrice(item);
                const hasOverride = priceOverrides[item.id] !== undefined;
                const effectiveUnitPrice = hasOverride ? priceOverrides[item.id] : calculatedUnitPrice;
                const isEditingPrice = editingPriceId === item.id;
                const availableVariants = item.menuItem.variants || [];

                return (
                  <div key={item.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                    {/* Item header: name, qty, price */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.menuItem.name} <span className="text-muted-foreground">x{item.quantity}</span></p>
                        {item.addonSelections.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            + {item.addonSelections.map(a => a.addon.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isEditingPrice ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              value={editingPriceValue}
                              onChange={(e) => setEditingPriceValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = parseFloat(editingPriceValue);
                                  if (!isNaN(val) && val >= 0) {
                                    setPriceOverrides(prev => ({ ...prev, [item.id]: val }));
                                  }
                                  setEditingPriceId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingPriceId(null);
                                }
                              }}
                              onBlur={() => {
                                const val = parseFloat(editingPriceValue);
                                if (!isNaN(val) && val >= 0) {
                                  setPriceOverrides(prev => ({ ...prev, [item.id]: val }));
                                }
                                setEditingPriceId(null);
                              }}
                              className="h-7 w-20 text-sm text-right"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            className="flex items-center gap-1 hover:bg-muted rounded px-1.5 py-0.5 transition-colors"
                            onClick={() => {
                              setEditingPriceId(item.id);
                              setEditingPriceValue(effectiveUnitPrice.toString());
                            }}
                          >
                            {hasOverride && (
                              <span className="text-xs text-muted-foreground line-through">₹{(calculatedUnitPrice * item.quantity).toFixed(0)}</span>
                            )}
                            <span className={cn("text-sm font-semibold", hasOverride && "text-primary")}>
                              ₹{(effectiveUnitPrice * item.quantity).toFixed(0)}
                            </span>
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                        {hasOverride && !isEditingPrice && (
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => {
                              setPriceOverrides(prev => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              });
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Variant chips (inline editing) */}
                    {availableVariants.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {availableVariants.map((variant) => {
                          const isSelected = item.selectedVariants.some(v => v.id === variant.id);
                          return (
                            <button
                              key={variant.id}
                              className={cn(
                                'text-xs px-2 py-1 rounded-full border transition-colors',
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                              )}
                              onClick={() => {
                                const newVariants = isSelected
                                  ? item.selectedVariants.filter(v => v.id !== variant.id)
                                  : [...item.selectedVariants, variant];
                                const newQty = Math.max(1, newVariants.length);
                                updateCartItem(item.id, { selectedVariants: newVariants, quantity: newQty });
                                // Clear price override when variants change so price recalculates
                                if (priceOverrides[item.id] !== undefined) {
                                  setPriceOverrides(prev => {
                                    const next = { ...prev };
                                    delete next[item.id];
                                    return next;
                                  });
                                }
                              }}
                            >
                              {variant.name} ₹{variant.price}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₹{getCheckoutTotal().toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowCheckout(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handlePlaceOrder} disabled={orderLoading} className="w-full sm:w-auto">
              {orderLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Place Order — ₹{getCheckoutTotal().toFixed(0)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
