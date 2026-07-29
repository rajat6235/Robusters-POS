'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import * as MealPackageService from '@/services/mealPackageService';
import { menuService } from '@/services/menuService';
import type { MenuItem } from '@/types/menu';

interface AllowedItemsDialogProps {
  package: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllowedItemsDialog({ package: pkg, open, onOpenChange }: AllowedItemsDialogProps) {
  const [itemType, setItemType] = useState<'category' | 'menuItem'>('category');
  const [selectedId, setSelectedId] = useState<string>('');
  // "Specific Menu Item" mode: which variants of that one item are checked.
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  // "Category" mode: variant picks per item within the expanded category
  // (itemId -> checked variant ids). An item with no entry, or an empty
  // array, is allowed unrestricted (any variant).
  const [categoryVariantSelections, setCategoryVariantSelections] = useState<Record<string, string[]>>({});
  // "Copy from another package" — which package to copy allowed items from.
  const [copyFromPackageId, setCopyFromPackageId] = useState<string>('');

  const queryClient = useQueryClient();

  // Fetch allowed items
  const { data: allowedItems, isLoading, isError } = useQuery({
    queryKey: ['allowed-items', pkg.id],
    queryFn: () => MealPackageService.getAllowedItems(pkg.id),
    enabled: open,
  });

  // Fetch the full public menu (categories with nested items + variants) —
  // used as the source for both the category and menu-item pickers below.
  const { data: menuResponse } = useQuery({
    queryKey: ['public-menu'],
    queryFn: () => menuService.getPublicMenu(),
    enabled: open,
  });
  const categories = menuResponse?.categories ?? [];
  const menuItems: MenuItem[] = categories.flatMap((cat) => cat.items);
  const selectedMenuItem = menuItems.find((i) => i.id === selectedId);
  const selectedCategory = categories.find((c) => c.id === selectedId);

  // Other packages to copy allowed items from.
  const { data: allPackages } = useQuery({
    queryKey: ['meal-packages'],
    queryFn: () => MealPackageService.getAllMealPackages(),
    enabled: open,
  });
  const otherPackages = (allPackages ?? []).filter((p) => p.id !== pkg.id);

  // Preview of what a copy would bring in, fetched as soon as a source is picked.
  const { data: copySourceItems, isFetching: isLoadingCopyPreview } = useQuery({
    queryKey: ['allowed-items', copyFromPackageId],
    queryFn: () => MealPackageService.getAllowedItems(copyFromPackageId),
    enabled: open && !!copyFromPackageId,
  });

  // Reset picks whenever the selected item/category or mode changes, so a
  // stale selection from a previous choice can't leak into the next Add.
  useEffect(() => {
    setSelectedVariantIds([]);
    setCategoryVariantSelections({});
  }, [selectedId, itemType]);

  // Add allowed item(s) — always via bulkAddItems (it accepts a single-item
  // array fine), so one row per selected variant, or one row per item in an
  // expanded category, works the same way as a single simple add.
  const addMutation = useMutation({
    mutationFn: (items: Array<{ menuItemId?: string; variantId?: string; categoryId?: string }>) =>
      MealPackageService.bulkAddItems(pkg.id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed-items', pkg.id] });
      toast.success('Item(s) added successfully');
      setSelectedId('');
      setSelectedVariantIds([]);
      setCategoryVariantSelections({});
    },
    onError: () => {
      toast.error('Failed to add item');
    },
  });

  // Copy all allowed items from another package onto this one. Duplicates
  // (already-allowed item/variant/category combos) are silently skipped by
  // the same DB-level uniqueness bulkAddItems already relies on elsewhere.
  const copyMutation = useMutation({
    mutationFn: () => {
      if (!copySourceItems || copySourceItems.length === 0) {
        return Promise.resolve([]);
      }
      const items = copySourceItems.map((item) => ({
        menuItemId: item.menu_item_id || undefined,
        variantId: item.variant_id || undefined,
        categoryId: item.category_id || undefined,
        maxQuantity: item.max_quantity || undefined,
      }));
      return MealPackageService.bulkAddItems(pkg.id, items);
    },
    onSuccess: (added) => {
      queryClient.invalidateQueries({ queryKey: ['allowed-items', pkg.id] });
      toast.success(
        added.length > 0
          ? `Copied ${added.length} item${added.length === 1 ? '' : 's'}`
          : 'Nothing new to copy — this package already has all of those items'
      );
      setCopyFromPackageId('');
    },
    onError: () => {
      toast.error('Failed to copy items');
    },
  });

  // Remove allowed item
  const removeMutation = useMutation({
    mutationFn: (itemId: string) => MealPackageService.removeAllowedItem(pkg.id, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed-items', pkg.id] });
      toast.success('Item removed successfully');
    },
    onError: () => {
      toast.error('Failed to remove item');
    },
  });

  const toggleVariant = (variantId: string) => {
    setSelectedVariantIds((prev) =>
      prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]
    );
  };

  const toggleCategoryItemVariant = (itemId: string, variantId: string) => {
    setCategoryVariantSelections((prev) => {
      const current = prev[itemId] || [];
      const next = current.includes(variantId)
        ? current.filter((id) => id !== variantId)
        : [...current, variantId];
      return { ...prev, [itemId]: next };
    });
  };

  // Dishes in the expanded category that have variants but none checked yet
  // — a dish with variants can no longer be added "unrestricted by default";
  // at least one size/variant must be explicitly picked.
  const categoryItemsMissingVariant = (selectedCategory?.items ?? []).filter(
    (item) => item.hasVariants && item.variants.length > 0 && (categoryVariantSelections[item.id] || []).length === 0
  );

  const menuItemMissingVariant =
    itemType === 'menuItem' &&
    !!selectedMenuItem?.hasVariants &&
    (selectedMenuItem?.variants.length ?? 0) > 0 &&
    selectedVariantIds.length === 0;

  const canAdd =
    !!selectedId &&
    (itemType === 'category'
      ? !!selectedCategory && selectedCategory.items.length > 0 && categoryItemsMissingVariant.length === 0
      : !menuItemMissingVariant);

  const handleAdd = () => {
    if (!selectedId) {
      toast.error('Please select an item');
      return;
    }

    if (itemType === 'category') {
      if (!selectedCategory || selectedCategory.items.length === 0) {
        toast.error('This category has no items to add');
        return;
      }

      if (categoryItemsMissingVariant.length > 0) {
        toast.error(
          `Select at least one variant for: ${categoryItemsMissingVariant.map((i) => i.name).join(', ')}`
        );
        return;
      }

      // One row per item — variant-restricted to whatever was checked, or
      // the bare item for dishes with no variants at all.
      const items = selectedCategory.items.flatMap((item) => {
        const checked = categoryVariantSelections[item.id] || [];
        return checked.length > 0
          ? checked.map((variantId) => ({ menuItemId: item.id, variantId }))
          : [{ menuItemId: item.id }];
      });

      addMutation.mutate(items);
      return;
    }

    if (menuItemMissingVariant) {
      toast.error('Please select at least one variant');
      return;
    }

    if (selectedVariantIds.length > 0) {
      // One row per allowed variant — the customer will only be able to
      // order these specific sizes/variants of this dish.
      addMutation.mutate(
        selectedVariantIds.map((variantId) => ({ menuItemId: selectedId, variantId }))
      );
    } else {
      // Item has no variants at all — nothing to restrict.
      addMutation.mutate([{ menuItemId: selectedId }]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Allowed Items - {pkg.name}</DialogTitle>
          <DialogDescription>
            Define which menu items or categories customers can order with this package.
          </DialogDescription>
        </DialogHeader>

        {/* Add New Item */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">Add Allowed Item</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Item Type</Label>
              <Select value={itemType} onValueChange={(v: any) => { setItemType(v); setSelectedId(''); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">Category (All items in category)</SelectItem>
                  <SelectItem value="menuItem">Specific Menu Item</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {itemType === 'category' ? 'Select Category' : 'Select Menu Item'}
              </Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose..." />
                </SelectTrigger>
                <SelectContent>
                  {itemType === 'category'
                    ? categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))
                    : menuItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {itemType === 'menuItem' && selectedMenuItem && selectedMenuItem.hasVariants && selectedMenuItem.variants.length > 0 && (
            <div className="space-y-2">
              <Label>Allowed Variants</Label>
              <p className="text-xs text-muted-foreground">
                Select at least one size/variant customers may order.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {selectedMenuItem.variants.map((variant) => (
                  <label
                    key={variant.id}
                    className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={selectedVariantIds.includes(variant.id)}
                      onCheckedChange={() => toggleVariant(variant.id)}
                    />
                    <span className="text-sm">
                      {variant.label || variant.name} — ₹{Number(variant.price).toFixed(2)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {itemType === 'category' && selectedCategory && (
            <div className="space-y-2">
              <Label>Items in {selectedCategory.name} ({selectedCategory.items.length})</Label>
              <p className="text-xs text-muted-foreground">
                Every dish below will be allowed. Dishes with sizes/variants require at least one
                to be selected.
              </p>
              <div className="space-y-3 max-h-64 overflow-y-auto border rounded-md p-3">
                {selectedCategory.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items in this category.</p>
                ) : (
                  selectedCategory.items.map((item) => {
                    const needsVariant =
                      item.hasVariants &&
                      item.variants.length > 0 &&
                      (categoryVariantSelections[item.id] || []).length === 0;
                    return (
                      <div key={item.id} className="space-y-1.5">
                        <div className="text-sm font-medium">{item.name}</div>
                        {item.hasVariants && item.variants.length > 0 && (
                          <>
                            <div className="grid grid-cols-2 gap-1.5 pl-1">
                              {item.variants.map((variant) => (
                                <label
                                  key={variant.id}
                                  className="flex items-center gap-2 text-xs cursor-pointer"
                                >
                                  <Checkbox
                                    checked={(categoryVariantSelections[item.id] || []).includes(variant.id)}
                                    onCheckedChange={() => toggleCategoryItemVariant(item.id, variant.id)}
                                  />
                                  {variant.label || variant.name} — ₹{Number(variant.price).toFixed(2)}
                                </label>
                              ))}
                            </div>
                            {needsVariant && (
                              <p className="text-xs text-destructive pl-1">Select at least one variant</p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <Button
            onClick={handleAdd}
            disabled={!canAdd || addMutation.isPending}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            {itemType === 'category' && selectedCategory
              ? `Add ${selectedCategory.items.length} Item${selectedCategory.items.length === 1 ? '' : 's'} from Category`
              : 'Add Item'}
          </Button>
        </div>

        {/* Copy From Another Package */}
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Copy From Another Package
          </h3>
          <p className="text-xs text-muted-foreground">
            Bring in everything already allowed on another package. Items this package already has
            are skipped automatically.
          </p>

          <div className="flex gap-2">
            <Select value={copyFromPackageId} onValueChange={setCopyFromPackageId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choose a package..." />
              </SelectTrigger>
              <SelectContent>
                {otherPackages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => copyMutation.mutate()}
              disabled={!copyFromPackageId || isLoadingCopyPreview || !copySourceItems?.length || copyMutation.isPending}
            >
              <Copy className="mr-2 h-4 w-4" />
              {copyMutation.isPending ? 'Copying...' : 'Copy Items'}
            </Button>
          </div>

          {copyFromPackageId && (
            <p className="text-xs text-muted-foreground">
              {isLoadingCopyPreview
                ? 'Loading...'
                : copySourceItems?.length
                ? `${copySourceItems.length} item${copySourceItems.length === 1 ? '' : 's'} will be copied over.`
                : 'That package has no allowed items to copy.'}
            </p>
          )}
        </div>

        {/* Current Allowed Items */}
        <div className="space-y-4">
          <h3 className="font-semibold">Current Allowed Items</h3>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : isError ? (
            <p className="text-sm text-destructive">
              Failed to load allowed items. Please try again.
            </p>
          ) : !allowedItems || allowedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No items added yet. Add categories or menu items above.
            </p>
          ) : (
            <div className="space-y-2">
              {allowedItems.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {item.category_id && !item.menu_item_id && (
                      <>
                        <Badge>Category</Badge>
                        <span className="font-medium">{item.category_name}</span>
                      </>
                    )}
                    {item.menu_item_id && (
                      <>
                        <Badge variant="secondary">Menu Item</Badge>
                        <span className="font-medium">{item.item_name}</span>
                        {item.variant_name ? (
                          <span className="text-sm text-muted-foreground">
                            ({item.variant_name})
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Any variant</span>
                        )}
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
