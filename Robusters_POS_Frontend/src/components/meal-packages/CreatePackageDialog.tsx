'use client';

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

interface CreatePackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePackageDialog({ open, onOpenChange }: CreatePackageDialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const createMutation = useMutation({
    mutationFn: (data: any) => MealPackageService.createMealPackage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-packages'] });
      toast.success('Meal package created successfully');
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create package');
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate({
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
          <DialogTitle>Create Meal Package</DialogTitle>
          <DialogDescription>
            Create a new meal package template. This can be assigned to customers later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <PackageFormFields register={register} errors={errors} />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Package'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
