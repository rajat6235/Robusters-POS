'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { ArrowLeft, UserPlus, Package, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as MealPackageService from '@/services/mealPackageService';
import { customerService } from '@/services/customerService';

export default function AssignPackagePage() {
  const router = useRouter();
  // Stable per page-load — a retried submit (double-click, timeout) reuses
  // this key so the backend can dedupe it into a single assignment.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [remainingMeals, setRemainingMeals] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    mode: 'onTouched',
    defaultValues: {
      customerId: '',
      packageId: '',
      totalMeals: '',
      consumedMeals: '0',
      packagePrice: '',
      amountPaid: '',
      paymentStatus: 'pending' as const,
      startsAt: new Date().toISOString().split('T')[0],
      expiresAt: '',
      notes: '',
    },
  });

  const totalMeals = watch('totalMeals');
  const consumedMeals = watch('consumedMeals');
  const packagePrice = watch('packagePrice');

  // Calculate remaining meals
  useEffect(() => {
    const total = parseInt(totalMeals) || 0;
    const consumed = parseInt(consumedMeals) || 0;
    setRemainingMeals(Math.max(0, total - consumed));
  }, [totalMeals, consumedMeals]);

  // Core search — accepts an explicit query so it works both from the
  // auto-trigger effect and the manual Search button.
  const runSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q || q.length < 3) return;

    setSearching(true);
    setSearchResults([]);
    setSearchPerformed(false);

    try {
      const response = await customerService.searchCustomers(q);
      const customers = response.data.customers || [];
      setSearchResults(customers);
      setSearchPerformed(true);
    } catch (error: any) {
      toast.error(error?.message || 'Search failed');
      setSearchPerformed(true);
    } finally {
      setSearching(false);
    }
  }, []);

  // Auto-search after 400 ms once ≥ 3 characters are typed; clear results
  // immediately if the user deletes back below the threshold.
  useEffect(() => {
    if (debouncedSearch.trim().length >= 3) {
      runSearch(debouncedSearch);
    } else {
      setSearchResults([]);
      setSearchPerformed(false);
    }
  }, [debouncedSearch, runSearch]);

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setValue('customerId', customer.id);
    setSearchResults([]);
  };

  // Fetch packages
  const { data: packages } = useQuery({
    queryKey: ['meal-packages', { isActive: true }],
    queryFn: () => MealPackageService.getAllMealPackages({ isActive: true }),
  });

  // Handle package selection
  const handlePackageChange = (packageId: string) => {
    const pkg = packages?.find((p) => p.id === packageId);
    if (pkg) {
      setSelectedPackage(pkg);
      setValue('packageId', packageId, { shouldValidate: true });
      setValue('totalMeals', pkg.meal_count.toString(), { shouldValidate: true });
      setValue('packagePrice', Number(pkg.price).toString(), { shouldValidate: true });

      // Calculate expiry if validity_days is set
      if (pkg.validity_days) {
        const startDate = new Date(watch('startsAt'));
        const expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + pkg.validity_days);
        setValue('expiresAt', expiryDate.toISOString().split('T')[0]);
      }
    }
  };

  // Assign package mutation
  const assignMutation = useMutation({
    mutationFn: (data: any) => MealPackageService.assignPackage(data, idempotencyKey),
    onSuccess: () => {
      toast.success('Package assigned successfully!');
      router.push('/meal-packages');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to assign package');
    },
  });

  const onSubmit = (data: any) => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (!data.packageId) {
      toast.error('Please select a package');
      return;
    }

    assignMutation.mutate({
      customerId: selectedCustomer.id,
      packageId: data.packageId,
      totalMeals: parseInt(data.totalMeals),
      consumedMeals: parseInt(data.consumedMeals) || 0,
      packagePrice: parseFloat(data.packagePrice),
      amountPaid: parseFloat(data.amountPaid) || 0,
      paymentStatus: data.paymentStatus,
      startsAt: data.startsAt,
      expiresAt: data.expiresAt || undefined,
      notes: data.notes || undefined,
    });
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Assign Meal Package</h1>
        <p className="text-muted-foreground">
          Assign a meal package to a customer. Use "Consumed Meals" for migrating offline users.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Selection */}
        <Card>
          <CardHeader>
            <CardTitle>
              <UserPlus className="inline mr-2 h-5 w-5" />
              Select Customer
            </CardTitle>
            <CardDescription>Choose the customer to assign the package to</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedCustomer ? (
              <>
                <div className="space-y-2">
                  <Label>Search by name or phone</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      className="pl-9 pr-9"
                      placeholder="Type at least 3 characters…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoComplete="off"
                    />
                    {searching && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                        Searching…
                      </span>
                    )}
                    {searchQuery && !searching && (
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                          setSearchPerformed(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
                    <p className="text-xs text-muted-foreground">
                      {3 - searchQuery.trim().length} more character{3 - searchQuery.trim().length !== 1 ? 's' : ''} to search…
                    </p>
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select a customer:</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {searchResults.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleSelectCustomer(customer)}
                          className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="font-medium">
                            {customer.first_name} {customer.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {customer.phone}
                            {customer.email && ` • ${customer.email}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchPerformed && searchResults.length === 0 && !searching && (
                  <div className="text-center py-4 text-muted-foreground">
                    No customers found. Try a different search.
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Label>Selected Customer</Label>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted">
                  <div>
                    <div className="font-medium">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedCustomer.phone}
                      {selectedCustomer.email && ` • ${selectedCustomer.email}`}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setValue('customerId', '');
                      setSearchQuery('');
                      setSearchResults([]);
                      setSearchPerformed(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {errors.customerId && (
              <p className="text-sm text-red-500">{errors.customerId.message as string}</p>
            )}
          </CardContent>
        </Card>

        {/* Package Selection */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Package className="inline mr-2 h-5 w-5" />
              Select Package
            </CardTitle>
            <CardDescription>Choose the meal package to assign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="packageId">
                Package <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="packageId"
                control={control}
                rules={{ required: 'Please select a package' }}
                render={({ field }) => (
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handlePackageChange(value);
                    }}
                    value={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a package..." />
                    </SelectTrigger>
                    <SelectContent>
                      {packages?.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} - {pkg.meal_count} meals - ₹{Number(pkg.price).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.packageId && (
                <p className="text-sm text-red-500">{errors.packageId.message as string}</p>
              )}
            </div>

            {selectedPackage && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">{selectedPackage.name}</h4>
                {selectedPackage.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedPackage.description}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Meals:</span>{' '}
                    <span className="font-medium">{selectedPackage.meal_count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price:</span>{' '}
                    <span className="font-medium">₹{Number(selectedPackage.price).toFixed(2)}</span>
                  </div>
                  {selectedPackage.validity_days && (
                    <div>
                      <span className="text-muted-foreground">Validity:</span>{' '}
                      <span className="font-medium">{selectedPackage.validity_days} days</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meal Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Meal Configuration</CardTitle>
            <CardDescription>
              Configure meals. Set "Consumed Meals" if migrating an existing offline user.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>For Offline Users:</strong> If this customer already has a package offline
                and has consumed some meals, enter the number in "Consumed Meals" below.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalMeals">
                  Total Meals <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="totalMeals"
                  type="number"
                  {...register('totalMeals', {
                    required: 'Total meals is required',
                    min: { value: 1, message: 'Must be at least 1' },
                  })}
                />
                {errors.totalMeals && (
                  <p className="text-sm text-red-500">{errors.totalMeals.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumedMeals">
                  Consumed Meals ⭐
                </Label>
                <Input
                  id="consumedMeals"
                  type="number"
                  placeholder="0"
                  {...register('consumedMeals', {
                    min: { value: 0, message: 'Cannot be negative' },
                    validate: (value) =>
                      (parseInt(value) || 0) <= (parseInt(totalMeals) || 0) ||
                      'Cannot exceed total meals',
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  For offline migration
                </p>
                {errors.consumedMeals && (
                  <p className="text-sm text-red-500">{errors.consumedMeals.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Remaining Meals</Label>
                <div className="h-10 flex items-center px-3 bg-muted rounded-md">
                  <span className="text-2xl font-bold text-green-600">
                    {remainingMeals}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="packagePrice">
                  Package Price (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="packagePrice"
                  type="number"
                  step="0.01"
                  {...register('packagePrice', {
                    required: 'Package price is required',
                    min: { value: 0, message: 'Must be non-negative' },
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountPaid">Amount Paid (₹)</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('amountPaid', {
                    min: { value: 0, message: 'Must be non-negative' },
                    validate: (value) =>
                      (parseFloat(value) || 0) <= (parseFloat(packagePrice) || 0) ||
                      'Cannot exceed package price',
                  })}
                />
                {errors.amountPaid && (
                  <p className="text-sm text-red-500">{errors.amountPaid.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Controller
                  name="paymentStatus"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle>Validity Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startsAt">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startsAt"
                  type="date"
                  {...register('startsAt', {
                    required: 'Start date is required',
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiry Date</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  {...register('expiresAt')}
                />
                <p className="text-xs text-muted-foreground">
                  Optional - leave empty for no expiry
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g., Migrated from offline system. Customer had 30 meals, consumed 15."
              rows={3}
              {...register('notes')}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={assignMutation.isPending}>
            {assignMutation.isPending ? 'Assigning...' : 'Assign Package'}
          </Button>
        </div>
      </form>
    </div>
  );
}
