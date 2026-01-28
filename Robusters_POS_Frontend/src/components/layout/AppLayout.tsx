'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

  const navItems = [
    { href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
    { href: '/orders', icon: <ShoppingCart className="h-5 w-5" />, label: 'Orders' },
    { href: '/customers', icon: <Users className="h-5 w-5" />, label: 'Customers' },
  ];

  if (isAdmin) {
    navItems.push(
      { href: '/menu', icon: <UtensilsCrossed className="h-5 w-5" />, label: 'Menu Management' },
      { href: '/users', icon: <Shield className="h-5 w-5" />, label: 'User Management' },
      { href: '/activity-log', icon: <History className="h-5 w-5" />, label: 'Activity Log' }
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
          
          <nav className="flex-1 space-y-2 p-4">
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname === item.href || (item.href === '/orders' && pathname.startsWith('/orders'))}
              />
            ))}
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
          
          <nav className="flex-1 space-y-2 p-4">
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname === item.href || (item.href === '/orders' && pathname.startsWith('/orders'))}
                onClick={closeMobileMenu}
              />
            ))}
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
