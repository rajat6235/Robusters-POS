'use client';

import { CheckCircle2, Package, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OTP_ENABLED } from '@/services/mealPackageService';

interface OrderSuccessStepProps {
  orderResult: any;
  onNewOrder: () => void;
}

export function OrderSuccessStep({ orderResult, onNewOrder }: OrderSuccessStepProps) {
  return (
    <div className="text-center py-8 space-y-6">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
      </div>

      {/* Success Message */}
      <div>
        <h2 className="text-2xl font-bold text-green-600">Order Created Successfully!</h2>
        <p className="text-muted-foreground mt-2">
          The meal has been deducted from the customer's package.
        </p>
      </div>

      {/* Order Details */}
      <div className="max-w-md mx-auto space-y-4">
        <div className="border rounded-lg p-6 text-left space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">Order Number</span>
            </div>
            <Badge variant="secondary" className="text-base">
              {orderResult.order?.orderNumber}
            </Badge>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Meals Consumed:</span>
              <span className="font-medium">{orderResult.order?.mealsConsumed}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining Meals:</span>
              <span className="font-medium text-green-600">
                {orderResult.order?.remainingMeals}
              </span>
            </div>

            {OTP_ENABLED && (
              <div className="flex justify-between items-center pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">OTP Verified</span>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button onClick={onNewOrder} size="lg" className="w-full">
            Process Another Order
          </Button>
        </div>
      </div>

      {/* Additional Info */}
      <div className="text-xs text-muted-foreground max-w-md mx-auto">
        The order has been logged and the customer's package has been updated.
        You can view this order in the orders section.
      </div>
    </div>
  );
}
