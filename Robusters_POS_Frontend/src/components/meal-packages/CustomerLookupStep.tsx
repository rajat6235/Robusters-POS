'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Search, UserCheck, UserX, Package as PackageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as MealPackageService from '@/services/mealPackageService';

interface CustomerLookupStepProps {
  onCustomerFound: (data: any) => void;
}

export function CustomerLookupStep({ onCustomerFound }: CustomerLookupStepProps) {
  const [lookupResult, setLookupResult] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const lookupMutation = useMutation({
    mutationFn: (phone: string) => MealPackageService.lookupCustomerByPhone(phone),
    onSuccess: (data) => {
      setLookupResult(data);
      if (data.customerFound && data.hasActivePackage) {
        onCustomerFound(data);
      } else if (!data.customerFound) {
        toast.error('Customer not found');
      } else if (!data.hasActivePackage) {
        toast.error('Customer has no active meal packages');
      }
    },
    onError: () => {
      toast.error('Failed to lookup customer');
    },
  });

  const onSubmit = (data: any) => {
    lookupMutation.mutate(data.phone);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Customer Phone Number</Label>
          <div className="flex gap-2">
            <Input
              id="phone"
              type="tel"
              placeholder="Enter 10-digit phone number"
              maxLength={10}
              {...register('phone', {
                required: 'Phone number is required',
                pattern: {
                  value: /^[0-9]{10}$/,
                  message: 'Must be a valid 10-digit phone number',
                },
              })}
            />
            <Button type="submit" disabled={lookupMutation.isPending}>
              <Search className="mr-2 h-4 w-4" />
              {lookupMutation.isPending ? 'Searching...' : 'Search'}
            </Button>
          </div>
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone.message as string}</p>
          )}
        </div>
      </form>

      {/* Lookup Result */}
      {lookupResult && (
        <div className="space-y-4">
          {lookupResult.customerFound ? (
            <Alert className="border-green-200 bg-green-50">
              <UserCheck className="h-4 w-4 text-green-600" />
              <AlertDescription className="ml-2">
                <strong className="text-green-900">Customer Found:</strong>{' '}
                <span className="text-green-700">
                  {lookupResult.customer.name} ({lookupResult.customer.phone})
                </span>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <UserX className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {lookupResult.message}
              </AlertDescription>
            </Alert>
          )}

          {lookupResult.hasActivePackage && lookupResult.packages && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <PackageIcon className="h-5 w-5" />
                Active Packages ({lookupResult.packages.length})
              </h3>
              <div className="grid gap-3">
                {lookupResult.packages.map((pkg: any) => (
                  <div
                    key={pkg.id}
                    className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{pkg.packageName}</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>
                            Total: {pkg.totalMeals} meals | Consumed: {pkg.consumedMeals}
                          </div>
                          {pkg.expiresAt && (
                            <div>Expires: {new Date(pkg.expiresAt).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {pkg.remainingMeals}
                        </div>
                        <div className="text-xs text-muted-foreground">meals left</div>
                        <Badge className="mt-2">{pkg.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!lookupResult.hasActivePackage && lookupResult.customerFound && (
            <Alert>
              <AlertDescription>
                This customer has no active meal packages. Please assign a package first.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
