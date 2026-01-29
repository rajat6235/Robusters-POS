// API Response Types for Menu System
export type VariantType = 'SIZE' | 'PORTION' | 'CARB_TYPE' | 'CUSTOM';
export type DietType = 'veg' | 'non-veg' | 'vegan' | 'egg';

export interface Addon {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  unit?: string;
  unitQuantity?: number;
  calories?: number;
  proteinGrams?: number;
  addonGroup?: string;
  displayOrder: number;
  isAvailable: boolean;
}

export interface Variant {
  id: string;
  name: string;
  label?: string;
  price: number;
  calories?: number;
  proteinGrams?: number;
  displayOrder: number;
  isAvailable: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  categoryId: string;
  dietType: DietType;
  basePrice: number;
  hasVariants: boolean;
  variantType?: VariantType;
  calories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  fiberGrams?: number;
  isAvailable: boolean;
  isFeatured: boolean;
  imageUrl?: string;
  displayOrder: number;
  variants: Variant[];
  addons: Addon[];
}

export interface MenuCategory {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  items: MenuItem[];
}

export interface MenuResponse {
  categories: MenuCategory[];
}

// Price calculation types
export interface PriceBreakdown {
  basePrice: number;
  variantPrice: number;
  addonsPrice: number;
  totalPrice: number;
  quantity: number;
}

export interface CalculatePriceRequest {
  menuItemId: string;
  variantId?: string;
  addons?: { addonId: string; quantity: number }[];
}

export interface CalculatePriceResponse {
  success: boolean;
  data: {
    basePrice: number;
    variantPrice: number;
    addonsPrice: number;
    totalPrice: number;
    breakdown: {
      item: { name: string; price: number };
      variants: { name: string; price: number }[];
      addons: { name: string; price: number; quantity: number }[];
    };
  };
}

export interface CalculateOrderRequest {
  items: {
    menuItemId: string;
    quantity: number;
    variantId?: string;
    addons?: { addonId: string; quantity: number }[];
  }[];
}

export interface CalculateOrderResponse {
  success: boolean;
  data: {
    subtotal: number;
    tax: number;
    total: number;
    items: {
      itemId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
  };
}

// CRUD Request types
export interface CreateCategoryRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  categoryId: string;
  dietType: DietType;
  basePrice: number;
  hasVariants?: boolean;
  variantType?: VariantType;
  imageUrl?: string;
  displayOrder?: number;
  variants?: Omit<CreateVariantRequest, 'menuItemId'>[];
}

export interface UpdateMenuItemRequest {
  name?: string;
  description?: string;
  categoryId?: string;
  dietType?: DietType;
  basePrice?: number;
  hasVariants?: boolean;
  variantType?: VariantType;
  imageUrl?: string;
  displayOrder?: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
}

export interface CreateVariantRequest {
  menuItemId: string;
  name: string;
  label?: string;
  price: number;
  calories?: number;
  proteinGrams?: number;
  displayOrder?: number;
}

export interface UpdateVariantRequest {
  name?: string;
  label?: string;
  price?: number;
  calories?: number;
  proteinGrams?: number;
  displayOrder?: number;
  isAvailable?: boolean;
}

export interface CreateAddonRequest {
  name: string;
  description?: string;
  price: number;
  unit?: string;
  unitQuantity?: number;
  calories?: number;
  proteinGrams?: number;
  addonGroup?: string;
  displayOrder?: number;
}

export interface UpdateAddonRequest {
  name?: string;
  description?: string;
  price?: number;
  unit?: string;
  unitQuantity?: number;
  calories?: number;
  proteinGrams?: number;
  addonGroup?: string;
  displayOrder?: number;
  isAvailable?: boolean;
}

export interface LinkAddonToCategoryRequest {
  addonId: string;
  priceOverride?: number;
}

export interface CategoryAddon extends Addon {
  priceOverride?: number;
  isActive: boolean;
}
