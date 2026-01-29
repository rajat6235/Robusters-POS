import { useState } from 'react';
import { usePublicMenu } from '@/hooks/useMenu';
import { CategoryList } from './CategoryList';
import { MenuItemCard } from './MenuItemCard';
import { MenuItem, PriceBreakdown } from '@/types/menu';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface MenuViewProps {
  onAddToOrder?: (item: MenuItem, variantId: string, addonIds: string[], priceBreakdown: PriceBreakdown) => void;
}

export function MenuView({ onAddToOrder }: MenuViewProps) {
  const { user } = useAuth();
  const { data: menuData, isLoading, isError, error, refetch } = usePublicMenu();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading menu...</p>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">Failed to load menu</p>
        <p className="text-sm text-muted-foreground">
          {(error as Error)?.message || 'Please try again later'}
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const categories = menuData?.categories || [];
  
  // Set first category as default if none selected
  const currentCategoryId = selectedCategoryId || categories[0]?.id || null;
  const currentCategory = categories.find(c => c.id === currentCategoryId);
  const items = currentCategory?.items || [];

  // Sort items by display order
  const sortedItems = [...items].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-4">
      {/* Category Navigation */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2 -mx-4 px-4">
        <CategoryList
          categories={categories}
          selectedCategoryId={currentCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />
      </div>

      {/* Category Description */}
      {currentCategory?.description && (
        <p className="text-sm text-muted-foreground">{currentCategory.description}</p>
      )}

      {/* Menu Items Grid */}
      {sortedItems.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {sortedItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onAddToOrder={onAddToOrder}
              showAdminControls={user?.role === 'ADMIN'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No items in this category
        </div>
      )}
    </div>
  );
}
