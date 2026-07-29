'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import * as MealPackageService from '@/services/mealPackageService';
import { PackageFormFields } from './PackageFormFields';

interface EditPackageDialogProps {
  package: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPackageDialog({ package: pkg, open, onOpenChange }: EditPackageDialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (pkg) {
      reset({
        name: pkg.name,
        description: pkg.description || '',
        mealCount: pkg.meal_count,
        price: Number(pkg.price),
        validityDays: pkg.validity_days || '',
      });
    }
  }, [pkg, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => MealPackageService.updateMealPackage(pkg.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-packages'] });
      toast.success('Package updated successfully');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update package');
    },
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate({
      name: data.name,
      description: data.description || undefined,
      mealCount: parseInt(data.mealCount),
      price: parseFloat(data.price),
      validityDays: data.validityDays ? parseInt(data.validityDays) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Meal Package</DialogTitle>
          <DialogDescription>
            Update the meal package details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <PackageFormFields register={register} errors={errors} idPrefix="edit" />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update Package'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
