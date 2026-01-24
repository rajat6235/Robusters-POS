import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuService, managerMenuService, adminMenuService } from '@/services/menuService';
import {
  CalculatePriceRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  CreateVariantRequest,
  UpdateVariantRequest,
  CreateAddonRequest,
  UpdateAddonRequest,
} from '@/types/menu';
import { toast } from 'sonner';

// Query keys
export const menuKeys = {
  all: ['menu'] as const,
  public: () => [...menuKeys.all, 'public'] as const,
  price: (itemId: string) => [...menuKeys.all, 'price', itemId] as const,
};

// ============ PUBLIC HOOKS ============

export function usePublicMenu() {
  return useQuery({
    queryKey: menuKeys.public(),
    queryFn: () => menuService.getPublicMenu(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCalculatePrice() {
  return useMutation({
    mutationFn: (request: CalculatePriceRequest) => menuService.calculatePrice(request),
  });
}

export function useCalculateOrder() {
  return useMutation({
    mutationFn: menuService.calculateOrder,
  });
}

// ============ MANAGER HOOKS ============

export function useToggleItemAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => managerMenuService.toggleItemAvailability(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.public() });
      toast.success('Item availability updated');
    },
    onError: () => {
      toast.error('Failed to update availability');
    },
  });
}

// ============ ADMIN HOOKS ============

// Category mutations
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryRequest) => adminMenuService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.public() });
      toast.success('Category created');
    },
    onError: () => {
      toast.error('Failed to create category');
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryRequest }) =>
      adminMenuService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.public() });
      toast.success('Category updated');
    },
    onError: () => {
      toast.error('Failed to update category');
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminMenuService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.public() });
      toast.success('Category deleted');
    },
    onError: () => {
      toast.error('Failed to delete category');
    },
  });
}

// Item mutations
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMenuItemRequest) => adminMenuService.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.public() });
      toast.success('Menu item created');
    },
    onError: () => {
      toast.error('Failed to create item');
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMenuItemRequest }) =>
      adminMenuService.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.public() });
      toast.success('Menu item updated');
    },
    onError: () => {
      toast.error('Failed to update item');
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminMenuService.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.public() });
      toast.success('Menu item deleted');
    },
    onError: () => {
      toast.error('Failed to delete item');
    },
  });
}

// Variant mutations
export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVariantRequest) => adminMenuService.createVariant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.public() });
      toast.success('Variant created');
    },
    onError: () => {
      toast.error('Failed to create variant');
    },
  });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVariantRequest }) =>
      adminMenuService.updateVariant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.public() });
      toast.success('Variant updated');
    },
    onError: () => {
      toast.error('Failed to update variant');
    },
  });
}

export function useDeleteVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminMenuService.deleteVariant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.public() });
      toast.success('Variant deleted');
    },
    onError: () => {
      toast.error('Failed to delete variant');
    },
  });
}

// Addon mutations
export function useCreateAddon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAddonRequest) => adminMenuService.createAddon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.public() });
      toast.success('Add-on created');
    },
    onError: () => {
      toast.error('Failed to create add-on');
    },
  });
}

export function useUpdateAddon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAddonRequest }) =>
      adminMenuService.updateAddon(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.public() });
      toast.success('Add-on updated');
    },
    onError: () => {
      toast.error('Failed to update add-on');
    },
  });
}

export function useDeleteAddon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminMenuService.deleteAddon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.public() });
      toast.success('Add-on deleted');
    },
    onError: () => {
      toast.error('Failed to delete add-on');
    },
  });
}
