'use client';

import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ShoppingBag, Search, User, Package, Calendar, Utensils, IndianRupee } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getAllPackageOrders, type PackageOrder } from '@/services/mealPackageService';
import { useDebounce } from '@/hooks/useDebounce';

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function ItemsSummary({ orderItems }: { orderItems: any }) {
  if (!orderItems) return <span className="text-muted-foreground">—</span>;
  const items: any[] = Array.isArray(orderItems) ? orderItems : [];
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  const total = items.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
  const names = items.slice(0, 2).map((i: any) => i.name || i.itemName).filter(Boolean);
  const label = names.join(', ') + (items.length > 2 ? ` +${items.length - 2} more` : '');
  return (
    <span title={items.map((i: any) => `${i.name || i.itemName} x${i.quantity || 1}`).join(', ')}>
      {label} <span className="text-muted-foreground">({total} item{total !== 1 ? 's' : ''})</span>
    </span>
  );
}

function OrderRow({ order }: { order: PackageOrder }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[160px]">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        {formatDate(order.consumedAt)}
      </div>

      {/* Customer */}
      <div className="flex items-center gap-2 min-w-[160px]">
        <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{order.customerName}</p>
          <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
        </div>
      </div>

      {/* Package */}
      <div className="flex items-center gap-2 min-w-[140px]">
        <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm truncate">{order.packageName}</span>
      </div>

      {/* Items */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Utensils className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm truncate">
          <ItemsSummary orderItems={order.orderItems} />
        </span>
      </div>

      {/* Meals consumed */}
      <div className="shrink-0">
        <Badge variant="secondary" className="text-xs">
          {order.mealsConsumed} meal{order.mealsConsumed !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Value */}
      <div className="flex items-center gap-1 text-sm font-medium shrink-0 min-w-[80px] justify-end">
        <IndianRupee className="h-3.5 w-3.5" />
        {Number(order.orderTotal || 0).toFixed(2)}
      </div>

      {/* Order # */}
      <div className="text-xs text-muted-foreground shrink-0 min-w-[90px] text-right">
        #{order.orderNumber}
      </div>
    </div>
  );
}

export default function MealPackageOrdersPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['package-orders', debouncedSearch],
    queryFn: ({ pageParam = 0 }) =>
      getAllPackageOrders({
        limit: PAGE_SIZE,
        offset: pageParam as number,
        search: debouncedSearch || undefined,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.orders.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allOrders = data?.pages.flatMap((p) => p.orders) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-7 w-7" />
            Meal Package Orders
          </h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Loading…' : `${total.toLocaleString()} order${total !== 1 ? 's' : ''} total`}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table header */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span className="min-w-[160px]">Date & Time</span>
          <span className="min-w-[160px]">Customer</span>
          <span className="min-w-[140px]">Package</span>
          <span className="flex-1">Items</span>
          <span className="w-20 text-center">Meals</span>
          <span className="min-w-[80px] text-right">Value</span>
          <span className="min-w-[90px] text-right">Order #</span>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 border-b border-border animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-muted-foreground">
            Failed to load orders. Please refresh the page.
          </div>
        ) : allOrders.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            {debouncedSearch
              ? `No orders found for "${debouncedSearch}"`
              : 'No meal package orders placed yet.'}
          </div>
        ) : (
          allOrders.map((order) => <OrderRow key={order.id} order={order} />)
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} />

        {isFetchingNextPage && (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 border-b border-border animate-pulse bg-muted/20" />
            ))}
          </div>
        )}

        {!hasNextPage && allOrders.length > 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground">
            All {total.toLocaleString()} orders loaded
          </div>
        )}
      </div>
    </div>
  );
}
