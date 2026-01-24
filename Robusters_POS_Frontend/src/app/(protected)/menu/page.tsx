'use client';

import React, { useState, useEffect } from 'react';
import { useMenuStore } from '@/hooks/useMenuStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DietType, MenuItem } from '@/types/menu';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const dietColors: Record<DietType, string> = {
  veg: 'bg-green-500',
  'non-veg': 'bg-red-500',
  vegan: 'bg-emerald-400',
  egg: 'bg-yellow-500',
};

function MenuManagementContent() {
  const { 
    categories, 
    isLoading, 
    error, 
    loadMenu, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    addItem, 
    updateItem, 
    deleteItem, 
    toggleItemAvailability 
  } = useMenuStore();

  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Form states
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemDietType, setItemDietType] = useState<DietType>('veg');
  const [itemBasePrice, setItemBasePrice] = useState<number>(0);

  // Load menu data on mount
  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const resetForms = () => {
    setCategoryName('');
    setCategoryDesc('');
    setItemName('');
    setItemDesc('');
    setItemDietType('veg');
    setItemBasePrice(0);
    setEditingCategory(null);
    setEditingItem(null);
  };

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
      resetForms();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save category');
    }
  };

  const handleSaveItem = async () => {
    if (!itemName.trim() || !selectedCategoryId || itemBasePrice <= 0) { 
      toast.error('Item name, category, and base price are required'); 
      return; 
    }

    try {
      if (editingItem) {
        await updateItem(editingItem.id, { 
          name: itemName, 
          description: itemDesc, 
          dietType: itemDietType, 
          basePrice: itemBasePrice 
        });
        toast.success('Item updated');
      } else {
        await addItem(selectedCategoryId, { 
          name: itemName, 
          description: itemDesc, 
          dietType: itemDietType, 
          basePrice: itemBasePrice 
        });
        toast.success('Item added');
      }
      setShowItemDialog(false);
      resetForms();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save item');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm('Are you sure you want to delete this category? This will also delete all items in it.')) {
      try {
        await deleteCategory(categoryId);
        toast.success('Category deleted');
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete category');
      }
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem(itemId);
        toast.success('Item deleted');
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete item');
      }
    }
  };

  const handleToggleAvailability = async (itemId: string) => {
    try {
      await toggleItemAvailability(itemId);
      toast.success('Item availability updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update availability');
    }
  };

  const openEditCategory = (category: any) => {
    setEditingCategory(category.id);
    setCategoryName(category.name);
    setCategoryDesc(category.description || '');
    setShowCategoryDialog(true);
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

  if (isLoading && categories.length === 0) {
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">Manage categories, items, and pricing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetForms(); setShowCategoryDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={() => { resetForms(); setShowItemDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <Tabs defaultValue={categories[0]?.id}>
        <TabsList className="flex-wrap h-auto">
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>{cat.name} ({cat.items?.length || 0})</TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{cat.name}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditCategory(cat)}>
                  <Edit className="h-3 w-3 mr-1" />Edit Category
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                  <Trash2 className="h-3 w-3 mr-1" />Delete
                </Button>
              </div>
            </div>
            
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {cat.items?.map((item) => (
                <Card key={item.id} className={cn(!item.isAvailable && 'opacity-50')}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-start gap-2">
                        <div className={cn('h-3 w-3 rounded-full mt-1', dietColors[item.dietType])} />
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">₹{item.basePrice}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <Switch 
                        checked={item.isAvailable} 
                        onCheckedChange={() => handleToggleAvailability(item.id)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditItem(item)}>
                        <Edit className="h-3 w-3 mr-1" />Edit
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
                  </CardContent>
                </Card>
              )) || []}
              
              {(!cat.items || cat.items.length === 0) && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No items in this category yet.
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No categories found. Create your first category to get started.</p>
          <Button onClick={() => { resetForms(); setShowCategoryDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Category
          </Button>
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit' : 'Add'} Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input 
              placeholder="Category name" 
              value={categoryName} 
              onChange={(e) => setCategoryName(e.target.value)} 
            />
            <Input 
              placeholder="Description (optional)" 
              value={categoryDesc} 
              onChange={(e) => setCategoryDesc(e.target.value)} 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
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
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input 
              placeholder="Item name" 
              value={itemName} 
              onChange={(e) => setItemName(e.target.value)} 
            />
            
            <Input 
              placeholder="Description (optional)" 
              value={itemDesc} 
              onChange={(e) => setItemDesc(e.target.value)} 
            />
            
            <Select value={itemDietType} onValueChange={(v) => setItemDietType(v as DietType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="veg">Vegetarian</SelectItem>
                <SelectItem value="non-veg">Non-Vegetarian</SelectItem>
                <SelectItem value="vegan">Vegan</SelectItem>
                <SelectItem value="egg">Eggetarian</SelectItem>
              </SelectContent>
            </Select>
            
            <div>
              <label className="text-sm font-medium">Base Price (₹)</label>
              <Input 
                type="number" 
                placeholder="0" 
                value={itemBasePrice || ''} 
                onChange={(e) => setItemBasePrice(Number(e.target.value))} 
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MenuPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MenuManagementContent />
    </ProtectedRoute>
  );
}
