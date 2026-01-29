import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MenuCategory, CreateCategoryRequest, UpdateCategoryRequest } from '@/types/menu';
import { useCreateCategory, useUpdateCategory } from '@/hooks/useMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  displayOrder: z.coerce.number().int().min(0),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface AdminCategoryFormProps {
  category?: MenuCategory | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AdminCategoryForm({ category, onSuccess, onCancel }: AdminCategoryFormProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      description: category?.description || '',
      displayOrder: category?.displayOrder || 0,
    },
  });

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (isEditing && category) {
        const updatePayload: UpdateCategoryRequest = {
          name: data.name,
          description: data.description,
          displayOrder: data.displayOrder,
        };
        await updateCategory.mutateAsync({ id: category.id, data: updatePayload });
      } else {
        const createPayload: CreateCategoryRequest = {
          name: data.name,
          description: data.description,
          displayOrder: data.displayOrder,
        };
        await createCategory.mutateAsync(createPayload);
      }
      onSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Category Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Protein Bowls"
          {...register('name')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Category description..."
          {...register('description')}
          rows={3}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayOrder">Display Order</Label>
        <Input
          id="displayOrder"
          type="number"
          min={0}
          placeholder="0"
          {...register('displayOrder')}
          className={errors.displayOrder ? 'border-destructive' : ''}
        />
        {errors.displayOrder && <p className="text-sm text-destructive">{errors.displayOrder.message}</p>}
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || isSubmitting}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
