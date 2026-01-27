'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuCategory, MenuItem, Addon, Variant, DietType } from '@/types/menu';
import { menuService, adminMenuService, managerMenuService } from '@/services/menuService';

interface MenuStore {
  categories: MenuCategory[];
  addons: Addon[];
  isLoading: boolean;
  error: string | null;

  // Menu actions
  loadMenu: () => Promise<void>;
  loadAddons: () => Promise<void>;

  // Category actions
  addCategory: (category: { name: string; description?: string; imageUrl?: string }) => Promise<void>;
  updateCategory: (id: string, updates: { name?: string; description?: string; imageUrl?: string; isActive?: boolean }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Item actions
  addItem: (categoryId: string, item: {
    name: string;
    description?: string;
    dietType: DietType;
    basePrice: number;
    hasVariants?: boolean;
    variantType?: string;
    imageUrl?: string;
  }) => Promise<void>;
  updateItem: (itemId: string, updates: {
    name?: string;
    description?: string;
    categoryId?: string;
    dietType?: DietType;
    basePrice?: number;
    hasVariants?: boolean;
    variantType?: string;
    imageUrl?: string;
    isAvailable?: boolean;
  }) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  toggleItemAvailability: (itemId: string) => Promise<void>;

  // Variant actions
  addVariant: (itemId: string, variant: { name: string; label?: string; price: number; displayOrder?: number }) => Promise<void>;
  updateVariant: (variantId: string, itemId: string, updates: { name?: string; label?: string; price?: number; displayOrder?: number; isAvailable?: boolean }) => Promise<void>;
  deleteVariant: (variantId: string, itemId: string) => Promise<void>;

  // Addon actions
  addAddon: (addon: { name: string; price: number; description?: string; addonGroup?: string; unit?: string }) => Promise<void>;
  updateAddon: (id: string, updates: { name?: string; price?: number; description?: string; addonGroup?: string; unit?: string; isAvailable?: boolean }) => Promise<void>;
  deleteAddon: (id: string) => Promise<void>;

  // Category-Addon linking
  linkAddonToCategory: (categoryId: string, addonId: string, priceOverride?: number) => Promise<void>;
  unlinkAddonFromCategory: (categoryId: string, addonId: string) => Promise<void>;
}

// Map frontend diet type to backend enum
const DIET_TYPE_TO_BACKEND: Record<string, string> = {
  'veg': 'VEG',
  'non-veg': 'NON_VEG',
  'vegan': 'VEGAN',
  'egg': 'EGGETARIAN',
};

const DIET_TYPE_FROM_BACKEND: Record<string, DietType> = {
  'VEG': 'veg',
  'NON_VEG': 'non-veg',
  'VEGAN': 'vegan',
  'EGGETARIAN': 'egg',
};

// Transform snake_case DB response to camelCase frontend types
/* eslint-disable @typescript-eslint/no-explicit-any */
function transformVariant(v: any): Variant {
  return {
    id: v.id,
    name: v.name,
    label: v.label,
    price: Number(v.price),
    calories: v.calories,
    proteinGrams: v.protein_grams,
    displayOrder: v.display_order ?? 0,
    isAvailable: v.is_available ?? true,
  };
}

function transformItem(item: any, categoryId: string): MenuItem {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    categoryId: item.category_id || categoryId,
    dietType: DIET_TYPE_FROM_BACKEND[item.diet_type] || 'veg',
    basePrice: Number(item.base_price ?? item.basePrice ?? 0),
    hasVariants: item.has_variants ?? false,
    variantType: item.variant_type,
    calories: item.calories,
    proteinGrams: item.protein_grams,
    carbsGrams: item.carbs_grams,
    fatGrams: item.fat_grams,
    fiberGrams: item.fiber_grams,
    isAvailable: item.is_available ?? true,
    isFeatured: item.is_featured ?? false,
    imageUrl: item.image_url,
    displayOrder: item.display_order ?? 0,
    variants: (item.variants || []).map(transformVariant),
    addons: item.addons || [],
  };
}

function transformCategory(cat: any): MenuCategory {
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    imageUrl: cat.image_url,
    displayOrder: cat.display_order ?? 0,
    isActive: cat.is_active ?? true,
    items: (cat.items || []).map((item: any) => transformItem(item, cat.id)),
  };
}

function transformAddon(a: any): Addon {
  return {
    id: a.id,
    name: a.name,
    slug: a.slug,
    description: a.description,
    price: Number(a.price),
    unit: a.unit,
    unitQuantity: a.unit_quantity,
    calories: a.calories,
    proteinGrams: a.protein_grams,
    addonGroup: a.addon_group,
    displayOrder: a.display_order ?? 0,
    isAvailable: a.is_available ?? true,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export { transformAddon };

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = error as { response?: { data?: { message?: string; error?: { message?: string } } } };
    return resp.response?.data?.error?.message || resp.response?.data?.message || 'Operation failed';
  }
  if (error instanceof Error) return error.message;
  return 'Operation failed';
};

export const useMenuStore = create<MenuStore>()(
  persist(
    (set, get) => ({
      categories: [],
      addons: [],
      isLoading: false,
      error: null,

      // ---- Menu loading ----
      loadMenu: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await menuService.getPublicMenu();
          const categories = response.categories.map(transformCategory);
          set({ categories, isLoading: false });
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
        }
      },

      loadAddons: async () => {
        set({ isLoading: true, error: null });
        try {
          const raw = await adminMenuService.getAddons();
          const addons = raw.map(transformAddon);
          set({ addons, isLoading: false });
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
        }
      },

      // ---- Category CRUD ----
      addCategory: async (category) => {
        set({ isLoading: true, error: null });
        try {
          await adminMenuService.createCategory(category);
          await get().loadMenu();
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      updateCategory: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          await adminMenuService.updateCategory(id, updates);
          await get().loadMenu();
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      deleteCategory: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await adminMenuService.deleteCategory(id);
          set(state => ({
            categories: state.categories.filter(cat => cat.id !== id),
            isLoading: false,
          }));
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      // ---- Item CRUD ----
      addItem: async (categoryId, item) => {
        set({ isLoading: true, error: null });
        try {
          const payload = {
            ...item,
            categoryId,
            dietType: DIET_TYPE_TO_BACKEND[item.dietType] || item.dietType,
          };
          await adminMenuService.createItem(payload as any);
          await get().loadMenu();
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      updateItem: async (itemId, updates) => {
        set({ isLoading: true, error: null });
        try {
          const payload = {
            ...updates,
            ...(updates.dietType ? { dietType: DIET_TYPE_TO_BACKEND[updates.dietType] || updates.dietType } : {}),
          };
          await adminMenuService.updateItem(itemId, payload as any);
          await get().loadMenu();
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      deleteItem: async (itemId) => {
        set({ isLoading: true, error: null });
        try {
          await adminMenuService.deleteItem(itemId);
          set(state => ({
            categories: state.categories.map(cat => ({
              ...cat,
              items: cat.items.filter(item => item.id !== itemId),
            })),
            isLoading: false,
          }));
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      toggleItemAvailability: async (itemId) => {
        set({ isLoading: true, error: null });
        try {
          const raw: any = await managerMenuService.toggleItemAvailability(itemId);
          // Backend returns snake_case: is_available; also handle camelCase just in case
          const isAvailable = raw.is_available ?? raw.isAvailable ?? true;
          set(state => ({
            categories: state.categories.map(cat => ({
              ...cat,
              items: cat.items.map(item =>
                item.id === itemId ? { ...item, isAvailable } : item
              ),
            })),
            isLoading: false,
          }));
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      // ---- Variant CRUD ----
      addVariant: async (itemId, variant) => {
        set({ isLoading: true, error: null });
        try {
          await adminMenuService.createVariant({ menuItemId: itemId, ...variant });
          await get().loadMenu();
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      updateVariant: async (variantId, _itemId, updates) => {
        set({ isLoading: true, error: null });
        try {
          await adminMenuService.updateVariant(variantId, updates);
          await get().loadMenu();
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      deleteVariant: async (variantId, _itemId) => {
        set({ isLoading: true, error: null });
        try {
          await adminMenuService.deleteVariant(variantId);
          await get().loadMenu();
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      // ---- Addon CRUD ----
      addAddon: async (addon) => {
        set({ isLoading: true, error: null });
        try {
          const raw = await adminMenuService.createAddon(addon);
          const newAddon = transformAddon(raw);
          set(state => ({
            addons: [...state.addons, newAddon],
            isLoading: false,
          }));
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      updateAddon: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          const raw = await adminMenuService.updateAddon(id, updates);
          const updatedAddon = transformAddon(raw);
          set(state => ({
            addons: state.addons.map(a => (a.id === id ? updatedAddon : a)),
            isLoading: false,
          }));
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      deleteAddon: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await adminMenuService.deleteAddon(id);
          set(state => ({
            addons: state.addons.filter(a => a.id !== id),
            isLoading: false,
          }));
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      // ---- Category-Addon Linking ----
      linkAddonToCategory: async (categoryId, addonId, priceOverride) => {
        set({ isLoading: true, error: null });
        try {
          await adminMenuService.linkAddonToCategory(categoryId, { addonId, priceOverride });
          set({ isLoading: false });
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },

      unlinkAddonFromCategory: async (categoryId, addonId) => {
        set({ isLoading: true, error: null });
        try {
          await adminMenuService.unlinkAddonFromCategory(categoryId, addonId);
          set({ isLoading: false });
        } catch (error: unknown) {
          set({ error: getErrorMessage(error), isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: 'menu-store',
      partialize: (state) => ({ categories: state.categories }),
    }
  )
);
