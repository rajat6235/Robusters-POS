import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Variant, VariantType, CreateVariantRequest, UpdateVariantRequest } from '@/types/menu';
import { useCreateVariant, useUpdateVariant } from '@/hooks/useMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const variantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  label: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be positive'),
  displayOrder: z.coerce.number().int().min(0),
});

type VariantFormData = z.infer<typeof variantSchema>;

interface AdminVariantFormProps {
  variant?: Variant | null;
  itemId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AdminVariantForm({ variant, itemId, onSuccess, onCancel }: AdminVariantFormProps) {
  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();
  const isEditing = !!variant;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VariantFormData>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      name: variant?.name || '',
      label: variant?.label || '',
      price: variant?.price || 0,
      displayOrder: variant?.displayOrder || 0,
    },
  });

  const onSubmit = async (data: VariantFormData) => {
    try {
      if (isEditing && variant) {
        const updatePayload: UpdateVariantRequest = {
          name: data.name,
          label: data.label,
          price: data.price,
          displayOrder: data.displayOrder,
        };
        await updateVariant.mutateAsync({ id: variant.id, data: updatePayload });
      } else {
        const createPayload: CreateVariantRequest = {
          menuItemId: itemId,
          name: data.name,
          label: data.label,
          price: data.price,
          displayOrder: data.displayOrder,
        };
        await createVariant.mutateAsync(createPayload);
      }
      onSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createVariant.isPending || updateVariant.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Variant Name *</Label>
        <Input
          id="name"
          placeholder="e.g., 6oz, Half, Large"
          {...register('name')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          placeholder="e.g., Small, Medium, Large"
          {...register('label')}
        />
        <p className="text-xs text-muted-foreground">Optional display label</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price (₹) *</Label>
          <Input
            id="price"
            type="number"
            min={0}
            step={1}
            placeholder="0"
            {...register('price')}
            className={errors.price ? 'border-destructive' : ''}
          />
          {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display Order</Label>
          <Input
            id="displayOrder"
            type="number"
            min={0}
            placeholder="0"
            {...register('displayOrder')}
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || isSubmitting || !itemId}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
