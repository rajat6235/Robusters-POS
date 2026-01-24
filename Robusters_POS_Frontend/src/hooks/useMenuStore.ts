'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuCategory } from '@/types/menu';
import { menuService, adminMenuService } from '@/services/menuService';

interface MenuStore {
  categories: MenuCategory[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadMenu: () => Promise<void>;
  addCategory: (category: { name: string; description?: string; imageUrl?: string }) => Promise<void>;
  updateCategory: (id: string, updates: { name?: string; description?: string; imageUrl?: string; isActive?: boolean }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addItem: (categoryId: string, item: {
    name: string;
    description?: string;
    dietType: 'veg' | 'non-veg' | 'vegan' | 'egg';
    basePrice: number;
    imageUrl?: string;
  }) => Promise<void>;
  updateItem: (itemId: string, updates: {
    name?: string;
    description?: string;
    categoryId?: string;
    dietType?: 'veg' | 'non-veg' | 'vegan' | 'egg';
    basePrice?: number;
    imageUrl?: string;
    isAvailable?: boolean;
  }) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  toggleItemAvailability: (itemId: string) => Promise<void>;
}

export const useMenuStore = create<MenuStore>()(
  persist(
    (set, get) => ({
      categories: [],
      isLoading: false,
      error: null,

      loadMenu: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await menuService.getPublicMenu();
          set({ categories: response.categories, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to load menu',
            isLoading: false 
          });
        }
      },

      addCategory: async (category) => {
        set({ isLoading: true, error: null });
        try {
          const newCategory = await adminMenuService.createCategory(category);
          set(state => ({
            categories: [...state.categories, newCategory],
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to create category',
            isLoading: false 
          });
          throw error;
        }
      },

      updateCategory: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          const updatedCategory = await adminMenuService.updateCategory(id, updates);
          set(state => ({
            categories: state.categories.map(cat =>
              cat.id === id ? updatedCategory : cat
            ),
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to update category',
            isLoading: false 
          });
          throw error;
        }
      },

      deleteCategory: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await adminMenuService.deleteCategory(id);
          set(state => ({
            categories: state.categories.filter(cat => cat.id !== id),
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to delete category',
            isLoading: false 
          });
          throw error;
        }
      },

      addItem: async (categoryId, item) => {
        set({ isLoading: true, error: null });
        try {
          const newItem = await adminMenuService.createItem({
            ...item,
            categoryId
          });
          
          set(state => ({
            categories: state.categories.map(cat =>
              cat.id === categoryId 
                ? { ...cat, items: [...cat.items, newItem] }
                : cat
            ),
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to create item',
            isLoading: false 
          });
          throw error;
        }
      },

      updateItem: async (itemId, updates) => {
        set({ isLoading: true, error: null });
        try {
          const updatedItem = await adminMenuService.updateItem(itemId, updates);
          
          set(state => ({
            categories: state.categories.map(cat => ({
              ...cat,
              items: cat.items.map(item =>
                item.id === itemId ? updatedItem : item
              )
            })),
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to update item',
            isLoading: false 
          });
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
              items: cat.items.filter(item => item.id !== itemId)
            })),
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to delete item',
            isLoading: false 
          });
          throw error;
        }
      },

      toggleItemAvailability: async (itemId) => {
        set({ isLoading: true, error: null });
        try {
          // Note: This should use managerMenuService.toggleItemAvailability
          // but we'll implement it as an update for now
          const state = get();
          const item = state.categories
            .flatMap(cat => cat.items)
            .find(item => item.id === itemId);
          
          if (item) {
            await get().updateItem(itemId, { isAvailable: !item.isAvailable });
          }
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to toggle item availability',
            isLoading: false 
          });
          throw error;
        }
      },
    }),
    {
      name: 'menu-store',
      partialize: (state) => ({ categories: state.categories }), // Only persist categories
    }
  )
);
