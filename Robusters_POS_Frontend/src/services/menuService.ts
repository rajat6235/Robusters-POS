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
} from '@/types/menu';

// ============ PUBLIC APIs ============

export const menuService = {
  // Get full menu (categories → items → variants → addons)
  async getPublicMenu(): Promise<MenuResponse> {
    const response = await apiClient.get<{ success: boolean; data: { menu: MenuCategory[] } }>('/menu/public');
    return { categories: response.data.data.menu };
  },

  // Calculate price for a single item configuration
  async calculatePrice(request: CalculatePriceRequest): Promise<CalculatePriceResponse> {
    const response = await apiClient.post<CalculatePriceResponse>('/menu/calculate-price', request);
    return response.data;
  },

  // Calculate price for entire order
  async calculateOrder(request: CalculateOrderRequest): Promise<CalculateOrderResponse> {
    const response = await apiClient.post<CalculateOrderResponse>('/menu/calculate-order', request);
    return response.data;
  },
};

// ============ MANAGER APIs ============

export const managerMenuService = {
  // Toggle menu item availability
  async toggleItemAvailability(itemId: string): Promise<MenuItem> {
    const response = await apiClient.patch<MenuItem>(`/menu/items/${itemId}/toggle-availability`);
    return response.data;
  },
};

// ============ ADMIN APIs ============

export const adminMenuService = {
  // Category CRUD
  async createCategory(data: CreateCategoryRequest): Promise<MenuCategory> {
    const response = await apiClient.post<MenuCategory>('/menu/categories', data);
    return response.data;
  },

  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<MenuCategory> {
    const response = await apiClient.patch<MenuCategory>(`/menu/categories/${id}`, data);
    return response.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/menu/categories/${id}`);
  },

  // Menu Item CRUD
  async createItem(data: CreateMenuItemRequest): Promise<MenuItem> {
    const response = await apiClient.post<MenuItem>('/menu/items', data);
    return response.data;
  },

  async updateItem(id: string, data: UpdateMenuItemRequest): Promise<MenuItem> {
    const response = await apiClient.patch<MenuItem>(`/menu/items/${id}`, data);
    return response.data;
  },

  async deleteItem(id: string): Promise<void> {
    await apiClient.delete(`/menu/items/${id}`);
  },

  // Variant CRUD
  async createVariant(data: CreateVariantRequest): Promise<Variant> {
    const response = await apiClient.post<Variant>('/menu/variants', data);
    return response.data;
  },

  async updateVariant(id: string, data: UpdateVariantRequest): Promise<Variant> {
    const response = await apiClient.patch<Variant>(`/menu/variants/${id}`, data);
    return response.data;
  },

  async deleteVariant(id: string): Promise<void> {
    await apiClient.delete(`/menu/variants/${id}`);
  },

  // Addon CRUD
  async createAddon(data: CreateAddonRequest): Promise<Addon> {
    const response = await apiClient.post<Addon>('/menu/addons', data);
    return response.data;
  },

  async updateAddon(id: string, data: UpdateAddonRequest): Promise<Addon> {
    const response = await apiClient.patch<Addon>(`/menu/addons/${id}`, data);
    return response.data;
  },

  async deleteAddon(id: string): Promise<void> {
    await apiClient.delete(`/menu/addons/${id}`);
  },
};
