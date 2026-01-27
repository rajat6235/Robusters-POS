import { apiClient } from '@/lib/api';
import {
  MenuResponse,
  CalculatePriceRequest,
  CalculatePriceResponse,
  CalculateOrderRequest,
  CalculateOrderResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  CreateVariantRequest,
  UpdateVariantRequest,
  CreateAddonRequest,
  UpdateAddonRequest,
  MenuCategory,
  MenuItem,
  Variant,
  Addon,
  CategoryAddon,
  LinkAddonToCategoryRequest,
} from '@/types/menu';

// ============ PUBLIC APIs ============

export const menuService = {
  async getPublicMenu(): Promise<MenuResponse> {
    const response = await apiClient.get<{ success: boolean; data: { menu: MenuCategory[] } }>('/menu/public');
    return { categories: response.data.data.menu };
  },

  async calculatePrice(request: CalculatePriceRequest): Promise<CalculatePriceResponse> {
    const response = await apiClient.post<CalculatePriceResponse>('/menu/calculate-price', request);
    return response.data;
  },

  async calculateOrder(request: CalculateOrderRequest): Promise<CalculateOrderResponse> {
    const response = await apiClient.post<CalculateOrderResponse>('/menu/calculate-order', request);
    return response.data;
  },
};

// ============ MANAGER APIs ============

export const managerMenuService = {
  async toggleItemAvailability(itemId: string): Promise<MenuItem> {
    const response = await apiClient.patch<{ success: boolean; data: { item: MenuItem } }>(`/menu/items/${itemId}/toggle-availability`);
    return response.data.data.item;
  },
};

// ============ ADMIN APIs ============

export const adminMenuService = {
  // ---- Categories ----
  async getCategories(): Promise<MenuCategory[]> {
    const response = await apiClient.get<{ success: boolean; data: { categories: MenuCategory[] } }>('/menu/categories');
    return response.data.data.categories;
  },

  async createCategory(data: CreateCategoryRequest): Promise<MenuCategory> {
    const response = await apiClient.post<{ success: boolean; data: { category: MenuCategory } }>('/menu/categories', data);
    return response.data.data.category;
  },

  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<MenuCategory> {
    const response = await apiClient.put<{ success: boolean; data: { category: MenuCategory } }>(`/menu/categories/${id}`, data);
    return response.data.data.category;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/menu/categories/${id}`);
  },

  // ---- Menu Items ----
  async getMenuItem(id: string): Promise<MenuItem> {
    const response = await apiClient.get<{ success: boolean; data: { item: MenuItem } }>(`/menu/items/${id}`);
    return response.data.data.item;
  },

  async createItem(data: CreateMenuItemRequest): Promise<MenuItem> {
    const response = await apiClient.post<{ success: boolean; data: { item: MenuItem } }>('/menu/items', data);
    return response.data.data.item;
  },

  async updateItem(id: string, data: UpdateMenuItemRequest): Promise<MenuItem> {
    const response = await apiClient.put<{ success: boolean; data: { item: MenuItem } }>(`/menu/items/${id}`, data);
    return response.data.data.item;
  },

  async deleteItem(id: string): Promise<void> {
    await apiClient.delete(`/menu/items/${id}`);
  },

  // ---- Variants ----
  async createVariant(data: CreateVariantRequest): Promise<Variant> {
    const { menuItemId, ...body } = data;
    const response = await apiClient.post<{ success: boolean; data: { variant: Variant } }>(`/menu/items/${menuItemId}/variants`, body);
    return response.data.data.variant;
  },

  async updateVariant(id: string, data: UpdateVariantRequest): Promise<Variant> {
    const response = await apiClient.put<{ success: boolean; data: { variant: Variant } }>(`/menu/variants/${id}`, data);
    return response.data.data.variant;
  },

  async deleteVariant(id: string): Promise<void> {
    await apiClient.delete(`/menu/variants/${id}`);
  },

  // ---- Addons ----
  async getAddons(group?: string): Promise<Addon[]> {
    const params = group ? `?group=${group}` : '';
    const response = await apiClient.get<{ success: boolean; data: { addons: Addon[] } }>(`/menu/addons${params}`);
    return response.data.data.addons;
  },

  async createAddon(data: CreateAddonRequest): Promise<Addon> {
    const response = await apiClient.post<{ success: boolean; data: { addon: Addon } }>('/menu/addons', data);
    return response.data.data.addon;
  },

  async updateAddon(id: string, data: UpdateAddonRequest): Promise<Addon> {
    const response = await apiClient.put<{ success: boolean; data: { addon: Addon } }>(`/menu/addons/${id}`, data);
    return response.data.data.addon;
  },

  async deleteAddon(id: string): Promise<void> {
    await apiClient.delete(`/menu/addons/${id}`);
  },

  // ---- Category-Addon Linking ----
  async getCategoryAddons(categoryId: string): Promise<CategoryAddon[]> {
    const response = await apiClient.get<{ success: boolean; data: { addons: CategoryAddon[] } }>(`/menu/categories/${categoryId}/addons`);
    return response.data.data.addons;
  },

  async linkAddonToCategory(categoryId: string, data: LinkAddonToCategoryRequest): Promise<void> {
    await apiClient.post(`/menu/categories/${categoryId}/addons`, data);
  },

  async unlinkAddonFromCategory(categoryId: string, addonId: string): Promise<void> {
    await apiClient.delete(`/menu/categories/${categoryId}/addons/${addonId}`);
  },
};
