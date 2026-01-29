// User & Auth Types
export type UserRole = 'ADMIN' | 'MANAGER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Menu Types
export type DietType = 'veg' | 'non-veg' | 'vegan' | 'egg';

export interface PortionSize {
  id: string;
  name: string;
  size: string;
  price: number;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  quantity: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  dietType: DietType;
  portions: PortionSize[];
  addOns?: AddOn[];
  isAvailable: boolean;
  imageUrl?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  items: MenuItem[];
}

// Order Types
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  menuItem: MenuItem;
  portionId: string;
  quantity: number;
  addOns: { addOn: AddOn; quantity: number }[];
  specialInstructions?: string;
  itemTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerPhone?: string;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  completedAt?: string;
  createdBy: string;
}

// Customer Types
export interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string;
}

// Location Types
export interface Location {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
