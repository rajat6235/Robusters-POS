import { apiClient } from '@/lib/api';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface MealPackage {
  id: string;
  name: string;
  description?: string;
  meal_count: number;
  price: string | number;
  validity_days?: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMealPackageRequest {
  name: string;
  description?: string;
  mealCount: number;
  price: number;
  validityDays?: number;
}

export interface UpdateMealPackageRequest {
  name?: string;
  description?: string;
  mealCount?: number;
  price?: number;
  validityDays?: number;
}

export interface AllowedItem {
  id: string;
  package_id: string;
  menu_item_id?: string;
  variant_id?: string;
  category_id?: string;
  item_name?: string;
  variant_name?: string;
  category_name?: string;
  max_quantity?: number | null;
  created_at: string;
}

export interface CustomerPackage {
  id: string;
  customer_id: string;
  package_id: string;
  total_meals: number;
  consumed_meals: number;
  remaining_meals: number;
  package_price: string | number;
  amount_paid: string | number;
  payment_status: 'pending' | 'partial' | 'paid';
  starts_at: string;
  expires_at?: string;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  assigned_by: string;
  assigned_at: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  package_name?: string;
  package_description?: string;
  customer_name?: string;
  customer_phone?: string;
  assigned_by_name?: string;
}

export interface AssignPackageRequest {
  customerId: string;
  packageId: string;
  totalMeals?: number;
  consumedMeals?: number;
  packagePrice?: number;
  amountPaid?: number;
  paymentStatus?: 'pending' | 'partial' | 'paid';
  startsAt?: string;
  expiresAt?: string;
  notes?: string;
}

export interface PackageConsumption {
  id: string;
  customer_package_id: string;
  order_id: string;
  meals_consumed: number;
  consumed_at: string;
  order_total?: string | number;
  order_items?: any;
  order_number?: string;
  payment_method?: string;
}

// ==========================================
// MEAL PACKAGE CRUD
// ==========================================

export const createMealPackage = async (data: CreateMealPackageRequest): Promise<MealPackage> => {
  const response = await apiClient.post('/admin/meal-packages', data);
  return response.data.data.package;
};

export const getAllMealPackages = async (params?: {
  isActive?: boolean;
  mealCount?: number;
  limit?: number;
  offset?: number;
}): Promise<MealPackage[]> => {
  const response = await apiClient.get('/admin/meal-packages', { params });
  return response.data.data.packages;
};

export const getMealPackageById = async (id: string, includeItems = false): Promise<MealPackage> => {
  const response = await apiClient.get(`/admin/meal-packages/${id}`, {
    params: { includeItems },
  });
  return response.data.data.package;
};

export const updateMealPackage = async (
  id: string,
  data: UpdateMealPackageRequest
): Promise<MealPackage> => {
  const response = await apiClient.put(`/admin/meal-packages/${id}`, data);
  return response.data.data.package;
};

export const togglePackageStatus = async (id: string): Promise<MealPackage> => {
  const response = await apiClient.patch(`/admin/meal-packages/${id}/toggle`);
  return response.data.data.package;
};

export const deleteMealPackage = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/meal-packages/${id}`);
};

export const getPackageStatistics = async (id: string): Promise<any> => {
  const response = await apiClient.get(`/admin/meal-packages/${id}/statistics`);
  return response.data.data.statistics;
};

// ==========================================
// ALLOWED ITEMS
// ==========================================

export const getAllowedItems = async (packageId: string): Promise<AllowedItem[]> => {
  const response = await apiClient.get(`/admin/meal-packages/${packageId}/allowed-items`);
  return response.data.data.allowedItems;
};

export const addAllowedItem = async (
  packageId: string,
  data: {
    menuItemId?: string;
    variantId?: string;
    categoryId?: string;
    maxQuantity?: number;
  }
): Promise<AllowedItem> => {
  const response = await apiClient.post(`/admin/meal-packages/${packageId}/allowed-items`, data);
  return response.data.data.allowedItem;
};

export const removeAllowedItem = async (packageId: string, itemId: string): Promise<void> => {
  await apiClient.delete(`/admin/meal-packages/${packageId}/allowed-items/${itemId}`);
};

export const bulkAddItems = async (
  packageId: string,
  items: Array<{
    menuItemId?: string;
    variantId?: string;
    categoryId?: string;
    maxQuantity?: number;
  }>
): Promise<AllowedItem[]> => {
  const response = await apiClient.post(`/admin/meal-packages/${packageId}/allowed-items/bulk`, {
    items,
  });
  return response.data.data.addedItems;
};

export const clearAllowedItems = async (packageId: string): Promise<void> => {
  await apiClient.delete(`/admin/meal-packages/${packageId}/allowed-items`);
};

// ==========================================
// PACKAGE ASSIGNMENT
// ==========================================

export const assignPackage = async (
  data: AssignPackageRequest,
  idempotencyKey?: string
): Promise<CustomerPackage> => {
  const response = await apiClient.post('/admin/customer-packages', data, {
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  });
  return response.data.data.assignment;
};

export const getCustomerPackages = async (
  customerId: string,
  params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<CustomerPackage[]> => {
  const response = await apiClient.get(`/admin/customers/${customerId}/packages`, { params });
  return response.data.data.packages;
};

export const getCustomerPackageById = async (
  id: string,
  includeConsumption = false
): Promise<CustomerPackage> => {
  const response = await apiClient.get(`/admin/customer-packages/${id}`, {
    params: { includeConsumption },
  });
  return response.data.data.assignment;
};

export const updateCustomerPackage = async (
  id: string,
  data: {
    totalMeals?: number;
    packagePrice?: number;
    amountPaid?: number;
    paymentStatus?: string;
    expiresAt?: string;
    notes?: string;
  }
): Promise<CustomerPackage> => {
  const response = await apiClient.put(`/admin/customer-packages/${id}`, data);
  return response.data.data.assignment;
};

export const cancelCustomerPackage = async (
  id: string,
  reason?: string
): Promise<CustomerPackage> => {
  const response = await apiClient.post(`/admin/customer-packages/${id}/cancel`, { reason });
  return response.data.data.assignment;
};

export const completeCustomerPackage = async (id: string): Promise<CustomerPackage> => {
  const response = await apiClient.post(`/admin/customer-packages/${id}/complete`);
  return response.data.data.assignment;
};

export const getActivePackages = async (params?: {
  limit?: number;
  offset?: number;
}): Promise<CustomerPackage[]> => {
  const response = await apiClient.get('/admin/customer-packages/active', { params });
  return response.data.data.packages;
};

export const getExpiringPackages = async (days = 7): Promise<CustomerPackage[]> => {
  const response = await apiClient.get('/admin/customer-packages/expiring', {
    params: { days },
  });
  return response.data.data.packages;
};

export const getConsumptionHistory = async (
  customerPackageId: string,
  params?: {
    limit?: number;
    offset?: number;
  }
): Promise<PackageConsumption[]> => {
  const response = await apiClient.get(
    `/admin/customer-packages/${customerPackageId}/consumption`,
    { params }
  );
  return response.data.data.history;
};

// ==========================================
// OTP ORDER FLOW
// ==========================================

// Mirrors backend otpService.OTP_ENABLED — flip back to true once the SMS
// provider is wired up and OTP verification is re-enabled.
export const OTP_ENABLED = false;

export interface CustomerLookupResponse {
  customerFound: boolean;
  hasActivePackage: boolean;
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  packages?: Array<{
    id: string;
    packageName: string;
    totalMeals: number;
    consumedMeals: number;
    remainingMeals: number;
    expiresAt?: string;
    status: string;
  }>;
  message: string;
}

export interface AllowedMenuItemsResponse {
  customerPackage: {
    id: string;
    packageName: string;
    remainingMeals: number;
  };
  allowedItems: {
    categories: Array<{
      id: string;
      name: string;
      allowedItemId: string;
      maxQuantity?: number | null;
    }>;
    menuItems: Array<{
      id: string;
      name: string;
      price: string | number;
      allowedItemId: string;
      maxQuantity?: number | null;
    }>;
    variants: Array<{
      id: string;
      menuItemId: string;
      name: string;
      itemName: string;
      price: string | number;
      allowedItemId: string;
      maxQuantity?: number | null;
    }>;
  };
}

export interface RequestOTPResponse {
  success: boolean;
  message: string;
  phone: string;
  expiresAt: number;
  expiryMinutes: number;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  order?: {
    id: string;
    orderNumber: string;
    mealsConsumed: number;
    remainingMeals: number;
  };
  consumption?: PackageConsumption;
}

export interface PackageOrder {
  id: string;
  orderId: string;
  orderNumber: string;
  customerPackageId: string;
  customerName: string;
  customerPhone: string;
  packageName: string;
  mealsConsumed: number;
  consumedAt: string;
  orderTotal: string | number;
  orderItems: any;
}

export interface PackageOrdersResponse {
  orders: PackageOrder[];
  total: number;
  limit: number;
  offset: number;
}

export const getAllPackageOrders = async (params: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<PackageOrdersResponse> => {
  const response = await apiClient.get('/meal-package-orders/orders', { params });
  return response.data.data;
};

export const lookupCustomerByPhone = async (phone: string): Promise<CustomerLookupResponse> => {
  const response = await apiClient.post('/meal-package-orders/lookup', { phone });
  return response.data.data;
};

export const getAllowedMenuItems = async (
  customerPackageId: string
): Promise<AllowedMenuItemsResponse> => {
  const response = await apiClient.get(
    `/meal-package-orders/allowed-items/${customerPackageId}`
  );
  return response.data.data;
};

export const requestOTPForOrder = async (data: {
  customerPackageId: string;
  orderItems: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
    variantId?: string;
    categoryId?: string;
  }>;
}): Promise<RequestOTPResponse> => {
  const response = await apiClient.post('/meal-package-orders/request-otp', data);
  return {
    ...response.data,
    ...response.data.data,
  };
};

export const verifyOTPAndCreateOrder = async (
  data: {
    customerPackageId: string;
    otp?: string;
    orderItems: Array<{
      menuItemId: string;
      name: string;
      quantity: number;
      price: number;
      variantId?: string;
      categoryId?: string;
    }>;
    mealsToConsume?: number;
    notes?: string;
  },
  idempotencyKey?: string
): Promise<VerifyOTPResponse> => {
  const response = await apiClient.post('/meal-package-orders/verify-and-create', data, {
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  });
  return {
    ...response.data,
    ...response.data.data,
  };
};

// ==========================================
// DASHBOARD
// ==========================================

export interface DashboardPackage {
  id: string;
  customer: {
    name: string;
    phone: string;
  };
  package: {
    name: string;
    totalMeals: number;
    consumedMeals: number;
    remainingMeals: number;
  };
  status: string;
  paymentStatus: string;
  startsAt: string;
  expiresAt?: string;
  lastMealDate?: string;
  lastMealVerified: boolean;
}

export interface PackageDashboardResponse {
  packages: DashboardPackage[];
  total: number;
  totalRemainingMeals: number;
  avgConsumedMeals: number;
}

export const getPackageDashboard = async (params?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PackageDashboardResponse> => {
  const response = await apiClient.get('/meal-package-orders/dashboard', { params });
  const { packages, count, totalRemainingMeals, avgConsumedMeals } = response.data.data;
  return {
    packages,
    total: count ?? packages.length,
    totalRemainingMeals: totalRemainingMeals ?? 0,
    avgConsumedMeals: avgConsumedMeals ?? 0,
  };
};

export const getPackageConsumptionHistory = async (
  customerPackageId: string,
  params?: {
    limit?: number;
    offset?: number;
  }
): Promise<{
  customerPackage: any;
  history: any[];
}> => {
  const response = await apiClient.get(
    `/meal-package-orders/consumption-history/${customerPackageId}`,
    { params }
  );
  return response.data.data;
};
