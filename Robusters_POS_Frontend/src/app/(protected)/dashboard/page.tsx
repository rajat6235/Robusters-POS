'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  ArrowRight,
  RefreshCw,
  Crown,
  CalendarDays,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description, icon, trend }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="h-8 w-8 rounded-lg bg-primary/10 p-1.5 text-primary">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">
        {trend && <span className="text-primary">{trend}</span>} {description}
      </p>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { stats, weeklyAnalytics, weeklyTopCustomers, loading, error, refreshAll } = useDashboard();

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Stat cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-20 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom cards skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-14 w-full rounded-lg" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={refreshAll} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening at Robusters today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshAll} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/orders">
            <Button className="gap-2 touch-target">
              <ShoppingCart className="h-4 w-4" />
              New Order
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Orders"
          value={stats?.todayStats.totalOrders.toString() || '0'}
          description="orders placed today"
          icon={<ShoppingCart className="h-full w-full" />}
          trend={stats?.trends.orders}
        />
        <StatCard
          title="Today's Revenue"
          value={`₹${stats?.todayStats.totalRevenue.toFixed(0) || '0'}`}
          description="from all orders"
          icon={<DollarSign className="h-full w-full" />}
          trend={stats?.trends.revenue}
        />
        <StatCard
          title="Avg Order Value"
          value={`₹${stats?.todayStats.averageOrderValue.toFixed(0) || '0'}`}
          description="per transaction"
          icon={<TrendingUp className="h-full w-full" />}
        />
        <StatCard
          title="New Customers"
          value={stats?.todayStats.newCustomers.toString() || '0'}
          description="joined today"
          icon={<Users className="h-full w-full" />}
          trend={stats?.trends.customers}
        />
      </div>

      {/* Weekly Stats */}
      {weeklyAnalytics && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            This Week
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Week's Orders"
              value={weeklyAnalytics.totalOrders.toString()}
              description="orders this week"
              icon={<ShoppingCart className="h-full w-full" />}
            />
            <StatCard
              title="Week's Revenue"
              value={`₹${weeklyAnalytics.totalRevenue.toFixed(0)}`}
              description="total revenue"
              icon={<DollarSign className="h-full w-full" />}
            />
            <StatCard
              title="Week's Avg Order"
              value={`₹${weeklyAnalytics.averageOrderValue.toFixed(0)}`}
              description="per transaction"
              icon={<TrendingUp className="h-full w-full" />}
            />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link href="/orders">
              <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                <ShoppingCart className="h-6 w-6" />
                <span>Create Order</span>
              </Button>
            </Link>
            <Link href="/customers">
              <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                <Users className="h-6 w-6" />
                <span>Find Customer</span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div>
                      <p className="font-medium">{order.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.items.length > 50 
                          ? `${order.items.substring(0, 50)}...` 
                          : order.items}
                      </p>
                      {order.customerName && (
                        <p className="text-xs text-muted-foreground">
                          {order.customerName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{order.total}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No orders today yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Top Customers This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyTopCustomers?.customers && weeklyTopCustomers.customers.length > 0 ? (
                weeklyTopCustomers.customers.map((customer, index) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {customer.weeklyOrders} orders
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{customer.weeklySpent.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.loyaltyPoints} pts
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No customers this week yet
                </div>
              )}
            </div>
            {weeklyTopCustomers?.dateRange && (
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground text-center">
                {new Date(weeklyTopCustomers.dateRange.startDate).toLocaleDateString()} - {new Date(weeklyTopCustomers.dateRange.endDate).toLocaleDateString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
