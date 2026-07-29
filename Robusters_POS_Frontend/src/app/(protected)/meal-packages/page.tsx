'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as MealPackageService from '@/services/mealPackageService';
import { CreatePackageDialog } from '@/components/meal-packages/CreatePackageDialog';
import { EditPackageDialog } from '@/components/meal-packages/EditPackageDialog';
import { AllowedItemsDialog } from '@/components/meal-packages/AllowedItemsDialog';
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

export default function MealPackagesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editPackage, setEditPackage] = useState<any>(null);
  const [allowedItemsPackage, setAllowedItemsPackage] = useState<any>(null);
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch all packages
  const { data: packages, isLoading } = useQuery({
    queryKey: ['meal-packages'],
    queryFn: () => MealPackageService.getAllMealPackages(),
  });

  // Toggle package status
  const toggleMutation = useMutation({
    mutationFn: (id: string) => MealPackageService.togglePackageStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-packages'] });
      toast.success('Package status updated');
    },
    onError: () => {
      toast.error('Failed to update package status');
    },
  });

  // Delete package
  const deleteMutation = useMutation({
    mutationFn: (id: string) => MealPackageService.deleteMealPackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-packages'] });
      toast.success('Package deleted successfully');
      setDeletePackageId(null);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        'Failed to delete package';
      toast.error(msg);
    },
  });

  // Active-assignment count for whichever package is pending deletion, so
  // the confirmation makes the real impact visible instead of a blanket
  // "won't affect existing assignments" line.
  const { data: deleteStats } = useQuery({
    queryKey: ['package-statistics', deletePackageId],
    queryFn: () => MealPackageService.getPackageStatistics(deletePackageId as string),
    enabled: !!deletePackageId,
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Meal Packages</h1>
          <p className="text-muted-foreground">
            Create and manage subscription meal packages
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Package
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packages?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Packages</CardTitle>
            <Power className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {packages?.filter((p) => p.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Packages</CardTitle>
            <PowerOff className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {packages?.filter((p) => !p.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Packages</CardTitle>
          <CardDescription>
            Manage your meal package templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading packages...</div>
          ) : !packages || packages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No packages created yet. Click "Create Package" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Meals</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">
                      {pkg.name}
                      {pkg.description && (
                        <p className="text-sm text-muted-foreground">
                          {pkg.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{pkg.meal_count} meals</TableCell>
                    <TableCell>₹{Number(pkg.price).toFixed(2)}</TableCell>
                    <TableCell>
                      {pkg.validity_days ? `${pkg.validity_days} days` : 'No expiry'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAllowedItemsPackage(pkg)}
                        >
                          Items
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Edit ${pkg.name}`}
                          onClick={() => setEditPackage(pkg)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={pkg.is_active ? `Deactivate ${pkg.name}` : `Activate ${pkg.name}`}
                          onClick={() => toggleMutation.mutate(pkg.id)}
                        >
                          {pkg.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Delete ${pkg.name}`}
                          onClick={() => setDeletePackageId(pkg.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      {/* Dialogs */}
      <CreatePackageDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editPackage && (
        <EditPackageDialog
          package={editPackage}
          open={!!editPackage}
          onOpenChange={(open) => !open && setEditPackage(null)}
        />
      )}

      {allowedItemsPackage && (
        <AllowedItemsDialog
          package={allowedItemsPackage}
          open={!!allowedItemsPackage}
          onOpenChange={(open) => !open && setAllowedItemsPackage(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePackageId} onOpenChange={() => setDeletePackageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the package. This action cannot be undone.
            </AlertDialogDescription>
            {deleteStats && Number(deleteStats.active_assignments) > 0 && (
              <p className="text-sm font-medium text-amber-600">
                {deleteStats.active_assignments} customer{Number(deleteStats.active_assignments) === 1 ? '' : 's'} currently{' '}
                {Number(deleteStats.active_assignments) === 1 ? 'has' : 'have'} an active assignment on this package — deletion will be blocked until those are resolved.
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePackageId && deleteMutation.mutate(deletePackageId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
