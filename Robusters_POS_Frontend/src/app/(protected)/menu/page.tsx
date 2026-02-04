'use client';

import React, { useState, useEffect } from 'react';
import { useMenuStore, transformAddon } from '@/hooks/useMenuStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DietType, MenuItem, Variant, Addon } from '@/types/menu';
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Layers,
  Package,
  Link2,
  Unlink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { adminMenuService } from '@/services/menuService';

const dietColors: Record<DietType, string> = {
  veg: 'bg-green-500',
  'non-veg': 'bg-red-500',
  vegan: 'bg-emerald-400',
  egg: 'bg-yellow-500',
};

const ADDON_GROUPS = ['proteins', 'carbs', 'extras', 'dressings', 'salads'];

// ============================================================
// CATEGORY & ITEM MANAGEMENT TAB
// ============================================================
function CategoriesItemsTab() {
  const {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    addItem,
    updateItem,
    deleteItem,
    toggleItemAvailability,
    addVariant,
    updateVariant,
    deleteVariant,
  } = useMenuStore();

  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [variantItemId, setVariantItemId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Category form
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  // Item form
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemDietType, setItemDietType] = useState<DietType>('veg');
  const [itemBasePrice, setItemBasePrice] = useState<number>(0);

  // Variant form
  const [variantName, setVariantName] = useState('');
  const [variantLabel, setVariantLabel] = useState('');
  const [variantPrice, setVariantPrice] = useState<number>(0);

  const resetCategoryForm = () => {
    setCategoryName('');
    setCategoryDesc('');
    setEditingCategory(null);
  };

  const resetItemForm = () => {
    setItemName('');
    setItemDesc('');
    setItemDietType('veg');
    setItemBasePrice(0);
    setEditingItem(null);
  };

  const resetVariantForm = () => {
    setVariantName('');
    setVariantLabel('');
    setVariantPrice(0);
    setEditingVariant(null);
  };

  // ---- Category handlers ----
  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Category name required');
      return;
    }
    try {
      if (editingCategory) {
        await updateCategory(editingCategory, { name: categoryName, description: categoryDesc });
        toast.success('Category updated');
      } else {
        await addCategory({ name: categoryName, description: categoryDesc });
        toast.success('Category added');
      }
      setShowCategoryDialog(false);
      resetCategoryForm();
    } catch {
      toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm('Delete this category and all its items?')) {
      try {
        await deleteCategory(categoryId);
        toast.success('Category deleted');
      } catch {
        toast.error('Failed to delete category');
      }
    }
  };

  const openEditCategory = (category: { id: string; name: string; description?: string }) => {
    setEditingCategory(category.id);
    setCategoryName(category.name);
    setCategoryDesc(category.description || '');
    setShowCategoryDialog(true);
  };

  // ---- Item handlers ----
  const handleSaveItem = async () => {
    if (!itemName.trim() || !selectedCategoryId || itemBasePrice <= 0) {
      toast.error('Name, category, and price are required');
      return;
    }
    try {
      if (editingItem) {
        await updateItem(editingItem.id, {
          name: itemName,
          description: itemDesc,
          dietType: itemDietType,
          basePrice: itemBasePrice,
          categoryId: selectedCategoryId,
        });
        toast.success('Item updated');
      } else {
        await addItem(selectedCategoryId, {
          name: itemName,
          description: itemDesc,
          dietType: itemDietType,
          basePrice: itemBasePrice,
        });
        toast.success('Item added');
      }
      setShowItemDialog(false);
      resetItemForm();
    } catch {
      toast.error('Failed to save item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (confirm('Delete this item?')) {
      try {
        await deleteItem(itemId);
        toast.success('Item deleted');
      } catch {
        toast.error('Failed to delete item');
      }
    }
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDesc(item.description || '');
    setItemDietType(item.dietType);
    setItemBasePrice(item.basePrice);
    setSelectedCategoryId(item.categoryId);
    setShowItemDialog(true);
  };

  // ---- Variant handlers ----
  const handleSaveVariant = async () => {
    if (!variantName.trim() || variantPrice <= 0 || !variantItemId) {
      toast.error('Variant name and price are required');
      return;
    }
    try {
      if (editingVariant) {
        await updateVariant(editingVariant.id, variantItemId, {
          name: variantName,
          label: variantLabel || undefined,
          price: variantPrice,
        });
        toast.success('Variant updated');
      } else {
        await addVariant(variantItemId, {
          name: variantName,
          label: variantLabel || undefined,
          price: variantPrice,
        });
        toast.success('Variant added');
      }
      setShowVariantDialog(false);
      resetVariantForm();
    } catch {
      toast.error('Failed to save variant');
    }
  };

  const handleDeleteVariant = async (variantId: string, itemId: string) => {
    if (confirm('Delete this variant?')) {
      try {
        await deleteVariant(variantId, itemId);
        toast.success('Variant deleted');
      } catch {
        toast.error('Failed to delete variant');
      }
    }
  };

  const openAddVariant = (itemId: string) => {
    resetVariantForm();
    setVariantItemId(itemId);
    setShowVariantDialog(true);
  };

  const openEditVariant = (variant: Variant, itemId: string) => {
    setEditingVariant(variant);
    setVariantItemId(itemId);
    setVariantName(variant.name);
    setVariantLabel(variant.label || '');
    setVariantPrice(variant.price);
    setShowVariantDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-lg font-semibold">Categories & Items</h2>
          <p className="text-sm text-muted-foreground">Manage menu categories and items</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetCategoryForm();
              setShowCategoryDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Category
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetItemForm();
              setShowItemDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Item
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-4">No categories yet. Create your first category to get started.</p>
          <Button onClick={() => { resetCategoryForm(); setShowCategoryDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />Create First Category
          </Button>
        </div>
      ) : (
        <Tabs defaultValue={categories[0]?.id}>
          <TabsList className="flex-wrap h-auto">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name} ({cat.items?.length || 0})
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="mt-4">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <div>
                  <h3 className="font-semibold">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-sm text-muted-foreground">{cat.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditCategory(cat)}>
                    <Edit className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteCategory(cat.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />Delete
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {cat.items?.map((item) => (
                  <Card key={item.id} className={cn(
                    !item.isAvailable && 'opacity-50 bg-muted/30 border-dashed'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className={cn(
                            'h-3 w-3 rounded-full mt-1 shrink-0', 
                            dietColors[item.dietType], 
                            !item.isAvailable && 'opacity-50'
                          )} />
                          <div className="min-w-0">
                            <h4 className={cn(
                              "font-medium truncate", 
                              !item.isAvailable && 'text-muted-foreground line-through'
                            )}>{item.name}</h4>
                            <p className={cn(
                              "text-sm text-muted-foreground",
                              !item.isAvailable && 'line-through'
                            )}>
                              ₹{item.variants?.length > 0 
                                ? Math.min(...item.variants.map(v => v.price))
                                : item.basePrice}
                            </p>
                            {item.description && (
                              <p className={cn("text-xs text-muted-foreground mt-1 line-clamp-2", !item.isAvailable && 'opacity-70')}>{item.description}</p>
                            )}
                            {item.variants?.length > 0 && (
                              <Badge variant="secondary" className={cn("text-xs mt-1", !item.isAvailable && 'opacity-70')}>
                                <Layers className="h-3 w-3 mr-1" />{item.variants.length} variants
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {!item.isAvailable && (
                            <Badge variant="destructive" className="text-xs">
                              Unavailable
                            </Badge>
                          )}
                          <Switch
                            checked={item.isAvailable}
                            onCheckedChange={() => toggleItemAvailability(item.id)}
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="flex gap-1 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={cn("flex-1", !item.isAvailable && 'opacity-70')} 
                          onClick={() => openEditItem(item)}
                          disabled={!item.isAvailable}
                        >
                          <Edit className="h-3 w-3 mr-1" />Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(!item.isAvailable && 'opacity-70')}
                          onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                          title="Manage variants"
                          disabled={!item.isAvailable}
                        >
                          <Layers className="h-3 w-3 mr-1" />
                          {expandedItemId === item.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Expanded: Variants */}
                      {expandedItemId === item.id && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Variants</span>
                            <Button variant="ghost" size="sm" onClick={() => openAddVariant(item.id)}>
                              <Plus className="h-3 w-3 mr-1" />Add
                            </Button>
                          </div>
                          {item.variants?.length > 0 ? (
                            <div className="space-y-2">
                              {item.variants.map((v) => (
                                <div key={v.id} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5 text-sm">
                                  <div>
                                    <span className="font-medium">{v.name}</span>
                                    {v.label && <span className="text-muted-foreground ml-1">({v.label})</span>}
                                    <span className="ml-2 text-muted-foreground">₹{v.price}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEditVariant(v, item.id)}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteVariant(v.id, item.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No variants. Add one to offer size/portion options.</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {(!cat.items || cat.items.length === 0) && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No items in this category yet.
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit' : 'Add'} Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input placeholder="Category name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Input placeholder="Optional description" value={categoryDesc} onChange={(e) => setCategoryDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add'} Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Category</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input placeholder="Item name" value={itemName} onChange={(e) => setItemName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Input placeholder="Optional description" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} />
            </div>
            <div>
              <Label>Diet Type</Label>
              <Select value={itemDietType} onValueChange={(v) => setItemDietType(v as DietType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="veg">Vegetarian</SelectItem>
                  <SelectItem value="non-veg">Non-Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="egg">Eggetarian</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base Price (₹)</Label>
              <Input type="number" placeholder="0" value={itemBasePrice || ''} onChange={(e) => setItemBasePrice(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Dialog */}
      <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVariant ? 'Edit' : 'Add'} Variant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name (e.g. &quot;4oz&quot;, &quot;Half&quot;, &quot;Large&quot;)</Label>
              <Input placeholder="Variant name" value={variantName} onChange={(e) => setVariantName(e.target.value)} />
            </div>
            <div>
              <Label>Label (optional display text)</Label>
              <Input placeholder="e.g. 4 Ounces" value={variantLabel} onChange={(e) => setVariantLabel(e.target.value)} />
            </div>
            <div>
              <Label>Price (₹)</Label>
              <Input type="number" placeholder="0" value={variantPrice || ''} onChange={(e) => setVariantPrice(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVariantDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveVariant} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// ADD-ONS MANAGEMENT TAB
// ============================================================
function AddonsTab() {
  const { addons, isLoading, loadAddons, addAddon, updateAddon, deleteAddon } = useMenuStore();

  const [showDialog, setShowDialog] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>('all');

  // Form
  const [addonName, setAddonName] = useState('');
  const [addonPrice, setAddonPrice] = useState<number>(0);
  const [addonDesc, setAddonDesc] = useState('');
  const [addonGroup, setAddonGroup] = useState<string>('');
  const [addonUnit, setAddonUnit] = useState('');

  useEffect(() => {
    if (addons.length === 0) loadAddons();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setAddonName('');
    setAddonPrice(0);
    setAddonDesc('');
    setAddonGroup('');
    setAddonUnit('');
    setEditingAddon(null);
  };

  const handleSave = async () => {
    if (!addonName.trim() || addonPrice <= 0) {
      toast.error('Name and price are required');
      return;
    }
    try {
      const data = {
        name: addonName,
        price: addonPrice,
        description: addonDesc || undefined,
        addonGroup: addonGroup && addonGroup !== 'none' ? addonGroup : undefined,
        unit: addonUnit || undefined,
      };
      if (editingAddon) {
        await updateAddon(editingAddon.id, data);
        toast.success('Add-on updated');
      } else {
        await addAddon(data);
        toast.success('Add-on created');
      }
      setShowDialog(false);
      resetForm();
    } catch {
      toast.error('Failed to save add-on');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this add-on?')) {
      try {
        await deleteAddon(id);
        toast.success('Add-on deleted');
      } catch {
        toast.error('Failed to delete add-on');
      }
    }
  };

  const openEdit = (addon: Addon) => {
    setEditingAddon(addon);
    setAddonName(addon.name);
    setAddonPrice(addon.price);
    setAddonDesc(addon.description || '');
    setAddonGroup(addon.addonGroup || '');
    setAddonUnit(addon.unit || '');
    setShowDialog(true);
  };

  const filtered = filterGroup === 'all'
    ? addons
    : filterGroup === ''
      ? addons.filter((a) => !a.addonGroup)
      : addons.filter((a) => a.addonGroup === filterGroup);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-lg font-semibold">Add-ons</h2>
          <p className="text-sm text-muted-foreground">Manage global add-ons (proteins, carbs, extras, etc.)</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" />Add-on
        </Button>
      </div>

      {/* Group filter */}
      <div className="flex flex-wrap gap-2">
        <Button variant={filterGroup === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterGroup('all')}>
          All ({addons.length})
        </Button>
        {ADDON_GROUPS.map((g) => {
          const count = addons.filter((a) => a.addonGroup === g).length;
          if (count === 0) return null;
          return (
            <Button key={g} variant={filterGroup === g ? 'default' : 'outline'} size="sm" onClick={() => setFilterGroup(g)}>
              {g.charAt(0).toUpperCase() + g.slice(1)} ({count})
            </Button>
          );
        })}
        {addons.filter((a) => !a.addonGroup).length > 0 && (
          <Button variant={filterGroup === '' ? 'default' : 'outline'} size="sm" onClick={() => setFilterGroup('')}>
            Ungrouped ({addons.filter((a) => !a.addonGroup).length})
          </Button>
        )}
      </div>

      {/* Addon list */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {addons.length === 0 ? 'No add-ons yet. Create your first add-on.' : 'No add-ons in this group.'}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((addon) => (
            <Card key={addon.id} className={cn(!addon.isAvailable && 'opacity-50')}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{addon.name}</h4>
                    <p className="text-sm text-muted-foreground">₹{addon.price}</p>
                    {addon.description && (
                      <p className="text-xs text-muted-foreground mt-1">{addon.description}</p>
                    )}
                    <div className="flex gap-1 mt-1">
                      {addon.addonGroup && (
                        <Badge variant="secondary" className="text-xs">{addon.addonGroup}</Badge>
                      )}
                      {addon.unit && (
                        <Badge variant="outline" className="text-xs">{addon.unit}</Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant={addon.isAvailable ? 'default' : 'destructive'} className="text-xs shrink-0">
                    {addon.isAvailable ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(addon)}>
                    <Edit className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(addon.id)} disabled={isLoading}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Addon Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddon ? 'Edit' : 'Add'} Add-on</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input placeholder="Add-on name" value={addonName} onChange={(e) => setAddonName(e.target.value)} />
            </div>
            <div>
              <Label>Price (₹)</Label>
              <Input type="number" placeholder="0" value={addonPrice || ''} onChange={(e) => setAddonPrice(Number(e.target.value))} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input placeholder="Description" value={addonDesc} onChange={(e) => setAddonDesc(e.target.value)} />
            </div>
            <div>
              <Label>Group</Label>
              <Select value={addonGroup || 'none'} onValueChange={setAddonGroup}>
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {ADDON_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit (optional, e.g. &quot;100g&quot;, &quot;piece&quot;)</Label>
              <Input placeholder="piece" value={addonUnit} onChange={(e) => setAddonUnit(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// CATEGORY-ADDON LINKING TAB
// ============================================================
function CategoryAddonsTab() {
  const { categories, isLoading, linkAddonToCategory, unlinkAddonFromCategory } = useMenuStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categoryAddons, setCategoryAddons] = useState<Addon[]>([]);
  const [allAddons, setAllAddons] = useState<Addon[]>([]);
  const [loadingAddons, setLoadingAddons] = useState(false);

  const loadCategoryAddons = async (catId: string) => {
    setLoadingAddons(true);
    try {
      const [rawCatAddons, rawAddons] = await Promise.all([
        adminMenuService.getCategoryAddons(catId),
        adminMenuService.getAddons(),
      ]);
      setCategoryAddons(rawCatAddons.map(transformAddon));
      setAllAddons(rawAddons.map(transformAddon));
    } catch {
      toast.error('Failed to load addons');
    } finally {
      setLoadingAddons(false);
    }
  };

  useEffect(() => {
    if (selectedCategoryId) {
      loadCategoryAddons(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const linkedIds = new Set(categoryAddons.map((a) => a.id));
  const unlinkedAddons = allAddons.filter((a) => !linkedIds.has(a.id));

  const handleLink = async (addonId: string) => {
    try {
      await linkAddonToCategory(selectedCategoryId, addonId);
      toast.success('Add-on linked');
      loadCategoryAddons(selectedCategoryId);
    } catch {
      toast.error('Failed to link add-on');
    }
  };

  const handleUnlink = async (addonId: string) => {
    try {
      await unlinkAddonFromCategory(selectedCategoryId, addonId);
      toast.success('Add-on unlinked');
      loadCategoryAddons(selectedCategoryId);
    } catch {
      toast.error('Failed to unlink add-on');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Category Add-ons</h2>
        <p className="text-sm text-muted-foreground">Link add-ons to categories so items in that category can use them</p>
      </div>

      <div>
        <Label>Select Category</Label>
        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadingAddons ? (
        <div className="flex items-center gap-2 py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />Loading...
        </div>
      ) : selectedCategoryId ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Linked addons */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Linked ({categoryAddons.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryAddons.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No add-ons linked to this category.</p>
              ) : (
                <div className="space-y-2">
                  {categoryAddons.map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                      <div>
                        <span className="text-sm font-medium">{addon.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">₹{addon.price}</span>
                        {addon.addonGroup && (
                          <Badge variant="secondary" className="text-xs ml-2">{addon.addonGroup}</Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={() => handleUnlink(addon.id)} disabled={isLoading}>
                        <Unlink className="h-3 w-3 mr-1" />Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available to link */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Available ({unlinkedAddons.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unlinkedAddons.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">All add-ons are already linked.</p>
              ) : (
                <div className="space-y-2">
                  {unlinkedAddons.map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                      <div>
                        <span className="text-sm font-medium">{addon.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">₹{addon.price}</span>
                        {addon.addonGroup && (
                          <Badge variant="secondary" className="text-xs ml-2">{addon.addonGroup}</Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => handleLink(addon.id)} disabled={isLoading}>
                        <Link2 className="h-3 w-3 mr-1" />Link
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">Select a category to manage its add-ons.</p>
      )}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
function MenuManagementContent() {
  const { isLoading, error, loadMenu, categories } = useMenuStore();

  useEffect(() => {
    if (categories.length === 0) loadMenu();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && (!categories || categories.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading menu...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-red-500">Error: {error}</p>
        <Button onClick={loadMenu}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <p className="text-muted-foreground">Manage categories, items, variants, and add-ons</p>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Categories & Items</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="linking">Category Add-ons</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <CategoriesItemsTab />
        </TabsContent>

        <TabsContent value="addons" className="mt-4">
          <AddonsTab />
        </TabsContent>

        <TabsContent value="linking" className="mt-4">
          <CategoryAddonsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MenuPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <MenuManagementContent />
    </ProtectedRoute>
  );
}
