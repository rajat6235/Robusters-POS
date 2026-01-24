import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Variant, VariantType, CreateVariantRequest } from '@/types/menu';
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
  type: z.enum(['SIZE', 'PORTION', 'CARB_TYPE', 'PROTEIN_TYPE']),
  price: z.coerce.number().min(0, 'Price must be positive'),
  displayOrder: z.coerce.number().int().min(0),
  isDefault: z.boolean(),
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
      type: variant?.type || 'SIZE',
      price: variant?.price || 0,
      displayOrder: variant?.displayOrder || 0,
      isDefault: variant?.isDefault ?? false,
    },
  });

  const selectedType = watch('type');
  const isDefault = watch('isDefault');

  const onSubmit = async (data: VariantFormData) => {
    try {
      const payload: CreateVariantRequest = {
        itemId,
        name: data.name,
        type: data.type,
        price: data.price,
        displayOrder: data.displayOrder,
        isDefault: data.isDefault,
      };
      
      if (isEditing && variant) {
        await updateVariant.mutateAsync({ id: variant.id, data: payload });
      } else {
        await createVariant.mutateAsync(payload);
      }
      onSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createVariant.isPending || updateVariant.isPending;

  const typeOptions: { value: VariantType; label: string }[] = [
    { value: 'SIZE', label: 'Size (4oz, 6oz, 8oz)' },
    { value: 'PORTION', label: 'Portion (Half, Full)' },
    { value: 'CARB_TYPE', label: 'Carb Type (Rice, Quinoa)' },
    { value: 'PROTEIN_TYPE', label: 'Protein Type' },
  ];

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
        <Label>Variant Type *</Label>
        <Select
          value={selectedType}
          onValueChange={(value) => setValue('type', value as VariantType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="isDefault">Default Selection</Label>
          <p className="text-sm text-muted-foreground">Pre-select this variant</p>
        </div>
        <Switch
          id="isDefault"
          checked={isDefault}
          onCheckedChange={(checked) => setValue('isDefault', checked)}
        />
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
