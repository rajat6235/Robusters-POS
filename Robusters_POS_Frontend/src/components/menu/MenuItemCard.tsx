import { useState, useEffect, useCallback } from 'react';
import { MenuItem, PriceBreakdown } from '@/types/menu';
import { VariantSelector } from './VariantSelector';
import { AddonSelector } from './AddonSelector';
import { PriceDisplay } from './PriceDisplay';
import { useCalculatePrice, useToggleItemAvailability } from '@/hooks/useMenu';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Leaf, Drumstick, Egg } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToOrder?: (item: MenuItem, variantId: string, addonIds: string[], priceBreakdown: PriceBreakdown) => void;
  showAdminControls?: boolean;
  onEditItem?: (item: MenuItem) => void;
}

const dietIcons: Record<string, React.ReactNode> = {
  veg: <Leaf className="h-4 w-4 text-green-600" />,
  vegan: <Leaf className="h-4 w-4 text-green-700" />,
  'non-veg': <Drumstick className="h-4 w-4 text-red-600" />,
  egg: <Egg className="h-4 w-4 text-yellow-600" />,
};

const dietColors: Record<string, string> = {
  veg: 'border-green-500 bg-green-50 text-green-700',
  vegan: 'border-green-600 bg-green-100 text-green-800',
  'non-veg': 'border-red-500 bg-red-50 text-red-700',
  egg: 'border-yellow-500 bg-yellow-50 text-yellow-700',
};

export function MenuItemCard({ item, onAddToOrder, showAdminControls, onEditItem }: MenuItemCardProps) {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);

  const calculatePrice = useCalculatePrice();
  const toggleAvailability = useToggleItemAvailability();

  // Set default variant on mount
  useEffect(() => {
    if (item.variants && item.variants.length > 0) {
      const defaultVariant = item.variants.find(v => v.isDefault) || item.variants[0];
      setSelectedVariantId(defaultVariant.id);
    }
  }, [item.variants]);

  // Calculate price when selection changes
  const fetchPrice = useCallback(async () => {
    if (!selectedVariantId && item.variants?.length > 0) return;

    try {
      const response = await calculatePrice.mutateAsync({
        itemId: item.id,
        variantId: selectedVariantId || undefined,
        addonIds: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
        quantity: 1,
      });
      setPriceBreakdown(response.data);
    } catch (error) {
      // Fallback to local calculation if API fails
      const variant = item.variants?.find(v => v.id === selectedVariantId);
      const addonsTotal = selectedAddonIds.reduce((sum, id) => {
        const addon = item.addons?.find(a => a.id === id);
        return sum + (addon?.price || 0);
      }, 0);
      
      setPriceBreakdown({
        basePrice: item.basePrice,
        variantPrice: variant?.price || item.basePrice,
        addonsPrice: addonsTotal,
        quantity: 1,
        totalPrice: (variant?.price || item.basePrice) + addonsTotal,
      });
    }
  }, [item, selectedVariantId, selectedAddonIds, calculatePrice]);

  useEffect(() => {
    if (isExpanded) {
      fetchPrice();
    }
  }, [isExpanded, selectedVariantId, selectedAddonIds, fetchPrice]);

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddonIds(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleAddToOrder = () => {
    if (onAddToOrder && priceBreakdown && selectedVariantId) {
      onAddToOrder(item, selectedVariantId, selectedAddonIds, priceBreakdown);
      // Reset selections
      setSelectedAddonIds([]);
      setIsExpanded(false);
    }
  };

  const handleToggleAvailability = () => {
    toggleAvailability.mutate(item.id);
  };

  const displayPrice = item.variants?.length > 0
    ? Math.min(...item.variants.map(v => v.price))
    : item.basePrice;

  return (
    <Card 
      className={cn(
        'overflow-hidden transition-all duration-200',
        !item.isAvailable && 'opacity-60 bg-muted/30'
      )}
    >
      <CardHeader 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge 
                variant="outline" 
                className={cn('h-6 px-1.5', dietColors[item.dietType])}
              >
                {dietIcons[item.dietType]}
              </Badge>
              <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="font-bold text-primary">
                ₹{displayPrice}
                {item.variants?.length > 1 && <span className="text-xs font-normal">+</span>}
              </span>
              {!item.isAvailable && (
                <Badge variant="secondary" className="text-xs">Unavailable</Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Manager toggle availability */}
            {isManager && (
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <Switch
                  checked={item.isAvailable}
                  onCheckedChange={handleToggleAvailability}
                  disabled={toggleAvailability.isPending}
                />
              </div>
            )}
            
            {/* Admin edit button */}
            {showAdminControls && isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditItem?.(item);
                }}
              >
                Edit
              </Button>
            )}
            
            <div className="text-muted-foreground">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="px-4 pb-4 pt-0 space-y-4 border-t bg-muted/20">
          {/* Variant Selection */}
          {item.variants && item.variants.length > 0 && (
            <VariantSelector
              variants={item.variants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={setSelectedVariantId}
            />
          )}

          {/* Addon Selection */}
          {item.addons && item.addons.length > 0 && (
            <AddonSelector
              addons={item.addons}
              selectedAddonIds={selectedAddonIds}
              onToggleAddon={handleToggleAddon}
            />
          )}

          {/* Price Display */}
          <PriceDisplay
            breakdown={priceBreakdown}
            isLoading={calculatePrice.isPending}
            showDetails={true}
          />

          {/* Add to Order Button */}
          {onAddToOrder && item.isAvailable && (
            <Button 
              className="w-full"
              onClick={handleAddToOrder}
              disabled={!priceBreakdown || (item.variants?.length > 0 && !selectedVariantId)}
            >
              Add to Order
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
