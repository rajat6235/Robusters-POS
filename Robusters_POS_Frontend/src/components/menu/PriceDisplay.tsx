import { PriceBreakdown } from '@/types/menu';
import { Loader2 } from 'lucide-react';

interface PriceDisplayProps {
  breakdown: PriceBreakdown | null;
  isLoading?: boolean;
  showDetails?: boolean;
}

export function PriceDisplay({ breakdown, isLoading, showDetails = true }: PriceDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Calculating...</span>
      </div>
    );
  }

  if (!breakdown) {
    return null;
  }

  return (
    <div className="space-y-1">
      {showDetails && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {breakdown.basePrice > 0 && (
            <div className="flex justify-between">
              <span>Base Price</span>
              <span>₹{breakdown.basePrice}</span>
            </div>
          )}
          {breakdown.variantPrice > 0 && breakdown.variantPrice !== breakdown.basePrice && (
            <div className="flex justify-between">
              <span>Variant</span>
              <span>₹{breakdown.variantPrice}</span>
            </div>
          )}
          {breakdown.addonsPrice > 0 && (
            <div className="flex justify-between">
              <span>Add-ons</span>
              <span>+₹{breakdown.addonsPrice}</span>
            </div>
          )}
          {breakdown.quantity > 1 && (
            <div className="flex justify-between">
              <span>Quantity</span>
              <span>×{breakdown.quantity}</span>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-between items-center pt-1 border-t border-border">
        <span className="font-medium text-sm">Total</span>
        <span className="text-lg font-bold text-primary">₹{breakdown.totalPrice}</span>
      </div>
    </div>
  );
}
