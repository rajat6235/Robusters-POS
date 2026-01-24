// API Response Types for Menu System
export type VariantType = 'SIZE' | 'PORTION' | 'CARB_TYPE' | 'PROTEIN_TYPE';
export type DietType = 'veg' | 'non-veg' | 'vegan' | 'egg';

export interface Addon {
  id: string;
  name: string;
  price: number;
  quantity?: string;
  type?: string;
  isAvailable: boolean;
}

export interface Variant {
  id: string;
  name: string;
  type: VariantType;
  price: number;
  displayOrder: number;
  isDefault?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  dietType: DietType;
  basePrice: number;
  isAvailable: boolean;
  imageUrl?: string;
  displayOrder: number;
  variants: Variant[];
  addons: Addon[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  items: MenuItem[];
}

export interface MenuResponse {
  categories: MenuCategory[];
}

// Price calculation types
export interface CalculatePriceRequest {
  itemId: string;
  variantIds?: string[];
  addonSelections?: {
    addonId: string;
    quantity: number;
  }[];
}

export interface CalculatePriceResponse {
  success: boolean;
  data: {
    basePrice: number;
    variantPrice: number;
    addonPrice: number;
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
    itemId: string;
    quantity: number;
    variantIds?: string[];
    addonSelections?: {
      addonId: string;
      quantity: number;
    }[];
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
  imageUrl?: string;
  displayOrder?: number;
  variants?: Omit<Variant, 'id'>[];
}

export interface UpdateMenuItemRequest {
  name?: string;
  description?: string;
  categoryId?: string;
  dietType?: DietType;
  basePrice?: number;
  imageUrl?: string;
  displayOrder?: number;
  isAvailable?: boolean;
}

export interface CreateVariantRequest {
  menuItemId: string;
  name: string;
  type: VariantType;
  price: number;
  displayOrder?: number;
  isDefault?: boolean;
}

export interface UpdateVariantRequest {
  name?: string;
  type?: VariantType;
  price?: number;
  displayOrder?: number;
  isDefault?: boolean;
}

export interface CreateAddonRequest {
  name: string;
  price: number;
  quantity?: string;
  type?: string;
  displayOrder?: number;
}

export interface UpdateAddonRequest {
  name?: string;
  price?: number;
  quantity?: string;
  type?: string;
  displayOrder?: number;
  isAvailable?: boolean;
}
  itemId: string;
  variantId?: string;
  addonIds?: string[];
  quantity?: number;
}

export interface PriceBreakdown {
  basePrice: number;
  variantPrice: number;
  addonsPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface CalculatePriceResponse {
  success: boolean;
  data: PriceBreakdown;
}

// Order calculation types
export interface OrderItemRequest {
  itemId: string;
  variantId?: string;
  addonIds?: string[];
  quantity: number;
}

export interface CalculateOrderRequest {
  items: OrderItemRequest[];
}

export interface OrderItemBreakdown extends PriceBreakdown {
  itemName: string;
  variantName?: string;
  addonNames?: string[];
}

export interface CalculateOrderResponse {
  success: boolean;
  data: {
    items: OrderItemBreakdown[];
    subtotal: number;
    tax: number;
    total: number;
  };
}

// Admin CRUD types
export interface CreateCategoryRequest {
  name: string;
  description?: string;
  displayOrder: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  displayOrder?: number;
}

export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  categoryId: string;
  dietType: DietType;
  basePrice: number;
  isAvailable?: boolean;
  displayOrder: number;
}

export interface UpdateMenuItemRequest {
  name?: string;
  description?: string;
  categoryId?: string;
  dietType?: DietType;
  basePrice?: number;
  isAvailable?: boolean;
  displayOrder?: number;
}

export interface CreateVariantRequest {
  itemId: string;
  name: string;
  type: VariantType;
  price: number;
  displayOrder: number;
  isDefault?: boolean;
}

export interface UpdateVariantRequest {
  name?: string;
  type?: VariantType;
  price?: number;
  displayOrder?: number;
  isDefault?: boolean;
}

export interface CreateAddonRequest {
  name: string;
  price: number;
  quantity?: string;
  type?: string;
  isAvailable?: boolean;
}

export interface UpdateAddonRequest {
  name?: string;
  price?: number;
  quantity?: string;
  type?: string;
  isAvailable?: boolean;
}
