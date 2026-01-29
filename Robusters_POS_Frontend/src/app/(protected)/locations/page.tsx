'use client';

import React, { useEffect, useState } from 'react';
import { locationService, Location, LocationData } from '@/services/locationService';
import { useLocationStore } from '@/hooks/useLocationStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, RefreshCw, Pencil, Trash2, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function LocationsPage() {
  const { toast } = useToast();
  const { fetchLocations: refreshStoreLocations } = useLocationStore();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Location | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await locationService.getLocations(true);
      if (response.success) {
        setLocations(response.data.locations);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch locations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleOpenCreate = () => {
    setEditingLocation(null);
    setFormName('');
    setFormAddress('');
    setFormPhone('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (location: Location) => {
    setEditingLocation(location);
    setFormName(location.name);
    setFormAddress(location.address || '');
    setFormPhone(location.phone || '');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingLocation(null);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast({ title: 'Error', description: 'Location name is required', variant: 'destructive' });
      return;
    }

    const data: LocationData = {
      name: formName.trim(),
      address: formAddress.trim() || undefined,
      phone: formPhone.trim() || undefined,
    };

    try {
      setIsSubmitting(true);
      if (editingLocation) {
        await locationService.updateLocation(editingLocation.id, data);
        toast({ title: 'Success', description: 'Location updated successfully' });
      } else {
        await locationService.createLocation(data);
        toast({ title: 'Success', description: 'Location created successfully' });
      }
      handleCloseForm();
      fetchLocations();
      refreshStoreLocations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Operation failed',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (location: Location) => {
    try {
      setIsLoading(true);
      await locationService.deleteLocation(location.id);
      toast({ title: 'Success', description: `${location.name} has been deactivated` });
      setDeleteConfirm(null);
      fetchLocations();
      refreshStoreLocations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to deactivate location',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  if (isLoading && locations.length === 0) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-16" />
            </CardHeader>
            <CardContent className="px-3 md:px-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Locations</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage cafe branches and locations
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLocations} disabled={isLoading} className="flex-1 sm:flex-none">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleOpenCreate} className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-lg md:text-xl">All Locations</CardTitle>
            <CardDescription>
              {locations.length} location{locations.length !== 1 ? 's' : ''} total
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {locations.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border rounded-md">
                <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p>No locations yet. Add your first location to get started.</p>
              </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {locations.map((location) => (
                    <Card key={location.id} className="mb-3">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium truncate">{location.name}</h3>
                              <Badge variant={location.is_active ? 'default' : 'secondary'}>
                                {location.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            {location.address && (
                              <p className="text-sm text-muted-foreground mt-1 truncate">{location.address}</p>
                            )}
                            {location.phone && (
                              <p className="text-sm text-muted-foreground">{location.phone}</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(location)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {location.is_active && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(location)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.map((location) => (
                        <TableRow key={location.id}>
                          <TableCell className="font-medium">{location.name}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {location.address || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{location.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={location.is_active ? 'default' : 'secondary'}>
                              {location.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleOpenEdit(location)}>
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              {location.is_active && (
                                <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteConfirm(location)}>
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Deactivate
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Edit Location' : 'Add New Location'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Main Branch"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Full address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="Contact phone number"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCloseForm} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? 'Saving...' : editingLocation ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Location</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to deactivate <strong>{deleteConfirm?.name}</strong>?
            It will no longer appear in the location selector, but existing orders linked to it will be preserved.
          </p>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="w-full sm:w-auto">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="w-full sm:w-auto">
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
