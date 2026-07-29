'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Minus, ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import * as MealPackageService from '@/services/mealPackageService';
import { menuService } from '@/services/menuService';
import type { MenuItem, Variant } from '@/types/menu';

interface MenuSelectionStepProps {
  customerPackage: any;
  onConfirm: (items: any[]) => void;
  onBack: () => void;
}

interface AvailableItem extends MenuItem {
  /** undefined = any variant of this item is allowed; otherwise only these variant ids are. */
  allowedVariantIds?: string[];
}

interface CartEntry {
  itemId: string;
  name: string;
  price: number;
  variantId?: string;
  variantLabel?: string;
  categoryId: string;
  quantity: number;
}

const cartKey = (itemId: string, variantId?: string) => `${itemId}::${variantId || 'base'}`;

export function MenuSelectionStep({ customerPackage, onConfirm, onBack }: MenuSelectionStepProps) {
  const [cart, setCart] = useState<Map<string, CartEntry>>(new Map());
  // Which variant chip is currently active per item (defaults to the first allowed variant).
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});

  // Fetch allowed items
  const { data: allowedItemsData, isLoading } = useQuery({
    queryKey: ['allowed-menu-items', customerPackage.id],
    queryFn: () => MealPackageService.getAllowedMenuItems(customerPackage.id),
  });

  // Fetch the full public menu (categories with nested items) to resolve
  // allowed-item ids/categories into orderable items.
  const { data: menuResponse, isError: menuLoadError } = useQuery({
    queryKey: ['public-menu'],
    queryFn: () => menuService.getPublicMenu(),
  });

  const addToCart = (item: AvailableItem, variant?: Variant) => {
    const key = cartKey(item.id, variant?.id);
    const newCart = new Map(cart);
    const existing = newCart.get(key);

    newCart.set(key, {
      itemId: item.id,
      name: item.name,
      price: variant ? Number(variant.price) : Number(item.basePrice || 0),
      variantId: variant?.id,
      variantLabel: variant?.label || variant?.name,
      categoryId: item.categoryId,
      quantity: (existing?.quantity || 0) + 1,
    });

    setCart(newCart);
  };

  const removeFromCart = (key: string) => {
    const newCart = new Map(cart);
    const existing = newCart.get(key);

    if (existing && existing.quantity > 1) {
      newCart.set(key, { ...existing, quantity: existing.quantity - 1 });
    } else {
      newCart.delete(key);
    }

    setCart(newCart);
  };

  const removeAllFromCart = (key: string) => {
    const newCart = new Map(cart);
    newCart.delete(key);
    setCart(newCart);
  };

  const handleConfirm = () => {
    const items = Array.from(cart.values()).map((entry) => ({
      menuItemId: entry.itemId,
      name: entry.variantLabel ? `${entry.name} (${entry.variantLabel})` : entry.name,
      quantity: entry.quantity,
      price: entry.price,
      variantId: entry.variantId,
      categoryId: entry.categoryId,
    }));

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    onConfirm(items);
  };

  const cartTotal = Array.from(cart.values()).reduce((sum, entry) => sum + entry.quantity, 0);

  // Resolve allowed items into orderable menu items, each annotated with
  // which variant(s) — if any — the package restricts it to. An item-level
  // or category-level rule means "any variant"; an item that appears only
  // via a variant-specific rule is restricted to just those variants.
  const getAvailableItems = (): AvailableItem[] => {
    if (!allowedItemsData || !menuResponse) return [];

    const allItems: MenuItem[] = menuResponse.categories.flatMap((cat) => cat.items);
    const byId = new Map(allItems.map((item) => [item.id, item]));

    const unrestrictedIds = new Set<string>();
    const variantsByItem = new Map<string, string[]>();

    allowedItemsData.allowedItems.categories.forEach((cat) => {
      allItems
        .filter((item) => item.categoryId === cat.id)
        .forEach((item) => unrestrictedIds.add(item.id));
    });

    allowedItemsData.allowedItems.menuItems.forEach((allowedItem) => {
      if (byId.has(allowedItem.id)) unrestrictedIds.add(allowedItem.id);
    });

    allowedItemsData.allowedItems.variants.forEach((v) => {
      if (!byId.has(v.menuItemId)) return;
      const list = variantsByItem.get(v.menuItemId) || [];
      list.push(v.id);
      variantsByItem.set(v.menuItemId, list);
    });

    const resultIds = new Set<string>([...unrestrictedIds, ...variantsByItem.keys()]);

    return Array.from(resultIds)
      .map((id) => byId.get(id))
      .filter((item): item is MenuItem => !!item)
      .map((item) => ({
        ...item,
        allowedVariantIds: unrestrictedIds.has(item.id) ? undefined : variantsByItem.get(item.id),
      }));
  };

  const availableItems = getAvailableItems();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {customerPackage.remainingMeals} meals remaining
          </div>
          <Badge variant="secondary">
            <ShoppingCart className="mr-1 h-3 w-3" />
            {cartTotal} in cart
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : menuLoadError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load the menu. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      ) : availableItems.length === 0 ? (
        <Alert>
          <AlertDescription>
            No items available for this package. Please configure allowed items first.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableItems.map((item) => {
              const effectiveVariants = item.hasVariants
                ? item.variants.filter((v) => !item.allowedVariantIds || item.allowedVariantIds.includes(v.id))
                : [];
              const hasSelectableVariants = effectiveVariants.length > 0;
              const currentVariantId = hasSelectableVariants
                ? selectedVariant[item.id] ?? effectiveVariants[0].id
                : undefined;
              const currentVariant = effectiveVariants.find((v) => v.id === currentVariantId);
              const key = cartKey(item.id, currentVariantId);
              const quantity = cart.get(key)?.quantity || 0;
              const displayPrice = currentVariant ? Number(currentVariant.price) : Number(item.basePrice || 0);

              return (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Badge variant="outline">₹{displayPrice.toFixed(2)}</Badge>
                    </div>

                    {hasSelectableVariants && (
                      <div className="flex flex-wrap gap-1.5">
                        {effectiveVariants.map((variant) => {
                          const variantKey = cartKey(item.id, variant.id);
                          const variantQuantity = cart.get(variantKey)?.quantity;
                          const isInCart = !!variantQuantity;
                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => {
                                if (isInCart) {
                                  removeAllFromCart(variantKey);
                                } else {
                                  setSelectedVariant((prev) => ({ ...prev, [item.id]: variant.id }));
                                }
                              }}
                              className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                                variant.id === currentVariantId
                                  ? 'border-primary bg-primary/10 font-medium'
                                  : 'border-input text-muted-foreground hover:bg-accent/50'
                              } ${isInCart ? 'pr-1' : ''}`}
                            >
                              {variant.label || variant.name} — ₹{Number(variant.price).toFixed(2)}
                              {variantQuantity ? (
                                <span className="ml-1 inline-flex items-center gap-0.5">
                                  <span>({variantQuantity})</span>
                                  <X className="h-2.5 w-2.5 opacity-60" />
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {quantity > 0 ? (
                        <div className="flex items-center gap-2 w-full">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAllFromCart(key)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFromCart(key)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <div className="flex-1 text-center font-medium">{quantity}</div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addToCart(item, currentVariant)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addToCart(item, currentVariant)}
                          className="w-full"
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          Add to Cart
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleConfirm} size="lg" disabled={cartTotal === 0}>
              Continue to OTP ({cartTotal} item{cartTotal !== 1 ? 's' : ''})
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
