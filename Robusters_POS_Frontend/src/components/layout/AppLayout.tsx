'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocationStore } from '@/hooks/useLocationStore';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  Users,
  LogOut,
  Menu,
  X,
  Shield,
  History,
  MapPin,
  Settings,
  Package,
  PackagePlus,
  Gauge,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SubNavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

interface NavItemConfig {
  href?: string;
  icon: React.ReactNode;
  label: string;
  subItems?: SubNavItem[];
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon, label, isActive, onClick }) => (
  <Link
    href={href}
    onClick={onClick}
    className={cn(
      'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all touch-target',
      'hover:bg-accent hover:text-accent-foreground',
      isActive
        ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
        : 'text-muted-foreground'
    )}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

interface NavGroupProps {
  icon: React.ReactNode;
  label: string;
  subItems: SubNavItem[];
  isActive: boolean;
  onClick?: () => void;
}

const NavGroup: React.FC<NavGroupProps> = ({ icon, label, subItems, isActive, onClick }) => {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [isActive]);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all touch-target',
          'hover:bg-accent hover:text-accent-foreground',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground'
        )}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {isExpanded && (
        <div className="ml-4 mt-1 space-y-1">
          {subItems.map((item) => {
            const isSubItemActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition-all touch-target',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  isSubItemActive
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'text-muted-foreground'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Location selector dropdown used in both desktop and mobile sidebar */
function LocationSelector() {
  const { locations, selectedLocationId, setSelectedLocation, fetchLocations } = useLocationStore();

  useEffect(() => {
    fetchLocations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeLocations = locations.filter(l => l.is_active);

  if (activeLocations.length === 0) return null;

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center gap-2 mb-1.5">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Location</span>
      </div>
      <Select
        value={selectedLocationId || ''}
        onValueChange={(value) => setSelectedLocation(value)}
      >
        <SelectTrigger className="w-full h-9 text-sm">
          <SelectValue placeholder="Select location" />
        </SelectTrigger>
        <SelectContent>
          {activeLocations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const isAdmin = user?.role === 'ADMIN';
  // Manager or Admin — matches the backend's `managerOrAdmin` route guard on
  // the ordering/assignment/dashboard endpoints. Package *definition* CRUD
  // (create/edit/delete/allowed-items) stays admin-only below, matching the
  // `adminOnly` guard on those specific routes.
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const navItems: NavItemConfig[] = [
    { href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
    { href: '/orders', icon: <ShoppingCart className="h-5 w-5" />, label: 'Orders' },
    { href: '/customers', icon: <Users className="h-5 w-5" />, label: 'Customers' },
  ];

  if (isManagerOrAdmin) {
    const mealPackageSubItems: SubNavItem[] = [];

    if (isAdmin) {
      mealPackageSubItems.push({
        href: '/meal-packages', icon: <Package className="h-4 w-4" />, label: 'Manage Packages',
      });
    }

    mealPackageSubItems.push(
      { href: '/meal-packages/assign', icon: <PackagePlus className="h-4 w-4" />, label: 'Assign Package' },
      { href: '/meal-package-orders', icon: <ShoppingCart className="h-4 w-4" />, label: 'Package Orders' },
      { href: '/meal-packages/dashboard', icon: <Gauge className="h-4 w-4" />, label: 'Dashboard' },
    );

    navItems.push({
      icon: <Package className="h-5 w-5" />,
      label: 'Meal Packages',
      subItems: mealPackageSubItems,
    });
  }

  if (isAdmin) {
    navItems.push(
      { href: '/menu', icon: <UtensilsCrossed className="h-5 w-5" />, label: 'Menu Management' },
      { href: '/locations', icon: <MapPin className="h-5 w-5" />, label: 'Locations' },
      { href: '/users', icon: <Shield className="h-5 w-5" />, label: 'User Management' },
      { href: '/activity-log', icon: <History className="h-5 w-5" />, label: 'Activity Log' },
      { href: '/settings', icon: <Settings className="h-5 w-5" />, label: 'Settings' }
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Robusters" width={32} height={32} className="h-8 w-8" />
          <span className="text-lg font-bold">Robusters</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="touch-target"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:border-r lg:bg-card">
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Image src="/logo.png" alt="Robusters" width={32} height={32} className="h-8 w-8" />
            <span className="text-xl font-bold">Robusters POS</span>
          </div>

          {/* Location Selector */}
          <div className="pt-3">
            <LocationSelector />
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {navItems.map((item, index) => {
              if (item.subItems) {
                // Grouped navigation item
                const isGroupActive = item.subItems.some(
                  (subItem) => pathname === subItem.href || pathname.startsWith(subItem.href)
                );
                return (
                  <NavGroup
                    key={`group-${index}`}
                    icon={item.icon}
                    label={item.label}
                    subItems={item.subItems}
                    isActive={isGroupActive}
                  />
                );
              } else {
                // Regular navigation item
                const isActive =
                  pathname === item.href ||
                  (item.href === '/orders' && pathname.startsWith('/orders'));
                return (
                  <NavItem
                    key={item.href}
                    href={item.href!}
                    icon={item.icon}
                    label={item.label}
                    isActive={isActive}
                  />
                );
              }
            })}
          </nav>

          <div className="border-t p-4">
            <div className="mb-3 rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={closeMobileMenu}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-72 transform border-r bg-card transition-transform duration-300 lg:hidden',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Image src="/logo.png" alt="Robusters" width={32} height={32} className="h-8 w-8" />
            <span className="text-xl font-bold">Robusters POS</span>
          </div>

          {/* Location Selector - Mobile */}
          <div className="pt-3">
            <LocationSelector />
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {navItems.map((item, index) => {
              if (item.subItems) {
                // Grouped navigation item
                const isGroupActive = item.subItems.some(
                  (subItem) => pathname === subItem.href || pathname.startsWith(subItem.href)
                );
                return (
                  <NavGroup
                    key={`group-${index}`}
                    icon={item.icon}
                    label={item.label}
                    subItems={item.subItems}
                    isActive={isGroupActive}
                    onClick={closeMobileMenu}
                  />
                );
              } else {
                // Regular navigation item
                const isActive =
                  pathname === item.href ||
                  (item.href === '/orders' && pathname.startsWith('/orders'));
                return (
                  <NavItem
                    key={item.href}
                    href={item.href!}
                    icon={item.icon}
                    label={item.label}
                    isActive={isActive}
                    onClick={closeMobileMenu}
                  />
                );
              }
            })}
          </nav>

          <div className="border-t p-4">
            <div className="mb-3 rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-64">
          <div className="container mx-auto p-4 lg:p-6 safe-area-inset">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
