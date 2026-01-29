import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Addon, CreateAddonRequest, UpdateAddonRequest } from '@/types/menu';
import { useCreateAddon, useUpdateAddon } from '@/hooks/useMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const addonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  price: z.coerce.number().min(0, 'Price must be positive'),
  unit: z.string().max(50).optional(),
  unitQuantity: z.coerce.number().min(0).optional(),
  addonGroup: z.string().max(50).optional(),
  isAvailable: z.boolean(),
});

type AddonFormData = z.infer<typeof addonSchema>;

interface AdminAddonFormProps {
  addon?: Addon | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AdminAddonForm({ addon, onSuccess, onCancel }: AdminAddonFormProps) {
  const createAddon = useCreateAddon();
  const updateAddon = useUpdateAddon();
  const isEditing = !!addon;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddonFormData>({
    resolver: zodResolver(addonSchema),
    defaultValues: {
      name: addon?.name || '',
      price: addon?.price || 0,
      unit: addon?.unit || '',
      unitQuantity: addon?.unitQuantity || 0,
      addonGroup: addon?.addonGroup || '',
      isAvailable: addon?.isAvailable ?? true,
    },
  });

  const isAvailable = watch('isAvailable');

  const onSubmit = async (data: AddonFormData) => {
    try {
      if (isEditing && addon) {
        const updatePayload: UpdateAddonRequest = {
          name: data.name,
          price: data.price,
          unit: data.unit,
          unitQuantity: data.unitQuantity,
          addonGroup: data.addonGroup,
          isAvailable: data.isAvailable,
        };
        await updateAddon.mutateAsync({ id: addon.id, data: updatePayload });
      } else {
        const createPayload: CreateAddonRequest = {
          name: data.name,
          price: data.price,
          unit: data.unit,
          unitQuantity: data.unitQuantity,
          addonGroup: data.addonGroup,
        };
        await createAddon.mutateAsync(createPayload);
      }
      onSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createAddon.isPending || updateAddon.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Add-on Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Extra Chicken, Brown Rice"
          {...register('name')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
          <Label htmlFor="unitQuantity">Unit Quantity</Label>
          <Input
            id="unitQuantity"
            type="number"
            min={0}
            step={1}
            placeholder="e.g., 100, 1"
            {...register('unitQuantity')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Input
            id="unit"
            placeholder="e.g., g, pc, ml"
            {...register('unit')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="addonGroup">Group</Label>
          <Input
            id="addonGroup"
            placeholder="e.g., Protein, Carbs, Extras"
            {...register('addonGroup')}
          />
          <p className="text-xs text-muted-foreground">Used to group add-ons in the UI</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="isAvailable">Available</Label>
          <p className="text-sm text-muted-foreground">Add-on can be selected</p>
        </div>
        <Switch
          id="isAvailable"
          checked={isAvailable}
          onCheckedChange={(checked) => setValue('isAvailable', checked)}
        />
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
