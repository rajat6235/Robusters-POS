'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  ArrowRight,
} from 'lucide-react';
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening at Robusters today.
          </p>
        </div>
        <Link href="/orders">
          <Button className="gap-2 touch-target">
            <ShoppingCart className="h-4 w-4" />
            New Order
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Orders"
          value="24"
          description="orders placed today"
          icon={<ShoppingCart className="h-full w-full" />}
          trend="+12%"
        />
        <StatCard
          title="Today's Revenue"
          value="₹12,450"
          description="from all orders"
          icon={<DollarSign className="h-full w-full" />}
          trend="+8%"
        />
        <StatCard
          title="Avg Order Value"
          value="₹519"
          description="per transaction"
          icon={<TrendingUp className="h-full w-full" />}
        />
        <StatCard
          title="New Customers"
          value="8"
          description="joined today"
          icon={<Users className="h-full w-full" />}
          trend="+4"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
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
              {[
                { id: '#1233', items: 'Grilled Chicken Salad', total: '₹280' },
                { id: '#1232', items: 'Brown Rice Bowl x2', total: '₹480' },
                { id: '#1231', items: 'Quinoa Salad', total: '₹320' },
              ].map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <div>
                    <p className="font-medium">{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.items}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{order.total}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
