'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Package, Users, TrendingUp, Eye, Ban, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import * as MealPackageService from '@/services/mealPackageService';
import { format } from 'date-fns';

export default function MealPackageDashboard() {
  const [searchInput, setSearchInput] = useState('');
  // Only what's actually been submitted (button click or Enter) drives the
  // query — typing alone no longer fires a request per keystroke, and the
  // Search button now does something instead of being a no-op.
  const [committedSearch, setCommittedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [cancelPackage, setCancelPackage] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [completePackage, setCompletePackage] = useState<any>(null);

  const queryClient = useQueryClient();

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['package-dashboard', { status: statusFilter, search: committedSearch }],
    queryFn: () =>
      MealPackageService.getPackageDashboard({
        status: statusFilter,
        search: committedSearch || undefined,
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => MealPackageService.cancelCustomerPackage(cancelPackage.id, cancelReason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-dashboard'] });
      toast.success('Package cancelled');
      setCancelPackage(null);
      setCancelReason('');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to cancel package');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => MealPackageService.completeCustomerPackage(completePackage.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-dashboard'] });
      toast.success('Package marked as completed');
      setCompletePackage(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to complete package');
    },
  });

  // Fetch consumption history
  const { data: historyData } = useQuery({
    queryKey: ['consumption-history', selectedPackage?.id],
    queryFn: () =>
      selectedPackage
        ? MealPackageService.getPackageConsumptionHistory(selectedPackage.id)
        : Promise.resolve(null),
    enabled: !!selectedPackage && historyDialogOpen,
  });

  const handleSearch = () => {
    setCommittedSearch(searchInput.trim());
  };

  const handleViewHistory = (pkg: any) => {
    setSelectedPackage(pkg);
    setHistoryDialogOpen(true);
  };

  // True totals computed server-side across the whole matching set, not just
  // the current page — stay correct once package counts outgrow one page.
  const packages = dashboardData?.packages ?? [];
  const totalPackages = dashboardData?.total ?? 0;
  const totalMealsRemaining = dashboardData?.totalRemainingMeals ?? 0;
  const avgConsumption = dashboardData?.avgConsumedMeals ?? 0;

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Meal Package Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor active packages and consumption patterns
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPackages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Meals Remaining</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalMealsRemaining}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Consumption</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConsumption} meals</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find packages by phone number or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="tel"
                placeholder="Search by phone number (10 digits)"
                maxLength={10}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Packages</CardTitle>
          <CardDescription>
            All meal packages with their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading packages...</div>
          ) : packages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No packages found. Adjust your filters or search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Meals</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Last Meal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{pkg.customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {pkg.customer.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{pkg.package.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Consumed:</span>
                          <span className="font-medium">{pkg.package.consumedMeals}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Remaining:</span>
                          <span className="font-bold text-green-600">
                            {pkg.package.remainingMeals}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total: {pkg.package.totalMeals}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          pkg.paymentStatus === 'paid'
                            ? 'default'
                            : pkg.paymentStatus === 'partial'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {pkg.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pkg.lastMealDate ? (
                        <div>
                          <div className="text-sm">
                            {format(new Date(pkg.lastMealDate), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(pkg.lastMealDate), 'hh:mm a')}
                          </div>
                          {pkg.lastMealVerified && (
                            <Badge variant="outline" className="mt-1">
                              ✓ OTP Verified
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No meals yet</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          pkg.status === 'active'
                            ? 'default'
                            : pkg.status === 'completed'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {pkg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewHistory(pkg)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          History
                        </Button>
                        {pkg.status === 'active' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`Mark ${pkg.customer.name}'s package completed`}
                              onClick={() => setCompletePackage(pkg)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Complete
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`Cancel ${pkg.customer.name}'s package`}
                              onClick={() => setCancelPackage(pkg)}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consumption History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consumption History</DialogTitle>
          </DialogHeader>

          {historyData && (
            <div className="space-y-4">
              {/* Package Info */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold mb-2">{historyData.customerPackage.packageName}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Customer:</span>{' '}
                    <span className="font-medium">{historyData.customerPackage.customerName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Meals:</span>{' '}
                    <span className="font-medium">{historyData.customerPackage.totalMeals}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Consumed:</span>{' '}
                    <span className="font-medium">{historyData.customerPackage.consumedMeals}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Remaining:</span>{' '}
                    <span className="font-medium text-green-600">
                      {historyData.customerPackage.remainingMeals}
                    </span>
                  </div>
                </div>
              </div>

              {/* History List */}
              <div className="space-y-3">
                {historyData.history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No consumption history yet
                  </p>
                ) : (
                  historyData.history.map((record: any) => (
                    <div key={record.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">Order #{record.orderNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(record.consumedAt), 'MMM dd, yyyy - hh:mm a')}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">{record.mealsConsumed} meal(s)</Badge>
                            {record.otpVerified && (
                              <Badge variant="outline">✓ OTP Verified</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Payment</div>
                          <div className="font-medium">{record.paymentMethod}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog
        open={!!cancelPackage}
        onOpenChange={(open) => {
          if (!open) {
            setCancelPackage(null);
            setCancelReason('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this package?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelPackage?.customer.name}'s {cancelPackage?.package.name} will be voided.
              {cancelPackage?.package.remainingMeals > 0 &&
                ` ${cancelPackage.package.remainingMeals} remaining meal(s) will no longer be usable.`}
              {' '}This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason (optional)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g., Customer requested a refund"
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Package</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Package'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Confirmation */}
      <AlertDialog open={!!completePackage} onOpenChange={(open) => !open && setCompletePackage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this package as completed?</AlertDialogTitle>
            <AlertDialogDescription>
              {completePackage?.customer.name}'s {completePackage?.package.name} will be closed out as completed.
              {completePackage?.package.remainingMeals > 0 &&
                ` ${completePackage.package.remainingMeals} remaining meal(s) will be forfeited — this is different from Cancel and can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? 'Completing...' : 'Mark Completed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
