'use client';

import React, { useState, useEffect } from 'react';
import { useMenuStore } from '@/hooks/useMenuStore';
import { useOrderStore } from '@/hooks/useOrderStore';
import { MenuItem, Variant, Addon, DietType } from '@/types/menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  ShoppingCart, Plus, Minus, Trash2, Search, Check, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const dietColors: Record<DietType, string> = {
  veg: 'bg-green-500',
  'non-veg': 'bg-red-500',
  vegan: 'bg-emerald-400',
  egg: 'bg-yellow-500',
};

export default function OrdersPage() {
  const { categories, isLoading: menuLoading, loadMenu } = useMenuStore();
  const { 
    cart, 
    addToCart, 
    updateCartItem, 
    removeFromCart, 
    getCartSubtotal, 
    getCartTax, 
    getCartTotal, 
    createOrder, 
    setCustomerInfo,
    isLoading: orderLoading
  } = useOrderStore();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Variant[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<{ addon: Addon; quantity: number }[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartTax, setCartTax] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  // Load menu data on mount
  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  // Set default category when categories load
  useEffect(() => {
    if (categories && categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  // Update cart totals when cart changes
  useEffect(() => {
    const updateTotals = async () => {
      try {
        const subtotal = await getCartSubtotal();
        const tax = await getCartTax();
        const total = await getCartTotal();
        setCartSubtotal(subtotal);
        setCartTax(tax);
        setCartTotal(total);
      } catch (error) {
        console.error('Error calculating totals:', error);
      }
    };

    updateTotals();
  }, [cart, getCartSubtotal, getCartTax, getCartTotal]);

  const currentCategory = categories?.find((c) => c.id === selectedCategory);
  const filteredItems = currentCategory?.items?.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) && item.isAvailable
  ) || [];

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
    setShowCheckout(true);
  };

  const handlePlaceOrder = async () => {
    try {
      setCustomerInfo(phone, name);
      await createOrder('CASH'); // Default to cash payment
      toast.success(`Order placed successfully!`);
      setShowCheckout(false);
      setPhone('');
      setName('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
    }
  };

  if (menuLoading && (!categories || categories.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading menu...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      {/* Menu Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search menu..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-10 h-12" 
            />
          </div>
        </div>

        {/* Category Tabs */}
        <ScrollArea className="w-full whitespace-nowrap mb-4">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="inline-flex h-auto p-1">
              {categories?.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="px-4 py-2 text-sm">
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </ScrollArea>

        {/* Menu Items Grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleSelectItem(item)}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <div className={cn('h-3 w-3 rounded-full mt-1', dietColors[item.dietType])} />
                    <h3 className="font-medium text-sm leading-tight">{item.name}</h3>
                  </div>
                  <p className="text-primary font-bold">₹{item.basePrice}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Cart Section */}
      <Card className="lg:w-80 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            Cart ({cart.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-3">
          <ScrollArea className="flex-1 -mx-3 px-3">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Cart is empty</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.menuItem.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.selectedVariants.map(v => v.name).join(', ')}
                        </p>
                        {item.addonSelections.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            + {item.addonSelections.map(a => `${a.addon.name} (${a.quantity})`).join(', ')}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => updateCartItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => updateCartItem(item.id, { quantity: item.quantity + 1 })}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-bold">₹{item.menuItem.basePrice * item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {cart.length > 0 && (
            <div className="border-t pt-3 mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (5%)</span>
                <span>₹{cartTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              <Button className="w-full h-12 text-base" onClick={handleCheckout} disabled={orderLoading}>
                {orderLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Place Order
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Selection Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={cn('h-3 w-3 rounded-full', selectedItem && dietColors[selectedItem.dietType])} />
              {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* Base Price */}
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">₹{selectedItem.basePrice}</p>
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
                            if (isSelected) {
                              setSelectedVariants(selectedVariants.filter(v => v.id !== variant.id));
                            } else {
                              setSelectedVariants([...selectedVariants, variant]);
                            }
                          }}
                        >
                          {variant.name} {variant.price > 0 && `+₹${variant.price}`}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add-ons */}
              {selectedItem.addons && selectedItem.addons.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Add-ons</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.addons.map((addon) => {
                      const isSelected = selectedAddons.some((a) => a.addon.id === addon.id);
                      return (
                        <Button 
                          key={addon.id} 
                          variant={isSelected ? 'default' : 'outline'} 
                          size="sm" 
                          className="justify-start" 
                          onClick={() => toggleAddon(addon)}
                        >
                          {isSelected && <Check className="h-3 w-3 mr-1" />}
                          {addon.name} +₹{addon.price}
                        </Button>
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

              <Button className="w-full" onClick={handleAddToCart}>
                Add to Cart
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Phone</label>
              <Input 
                placeholder="Enter phone number" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Name</label>
              <Input 
                placeholder="Enter customer name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
            </div>
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (5%)</span>
                <span>₹{cartTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>Cancel</Button>
            <Button onClick={handlePlaceOrder} disabled={orderLoading}>
              {orderLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}