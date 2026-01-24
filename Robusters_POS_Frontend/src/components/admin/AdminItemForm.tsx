import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MenuItem, MenuCategory, DietType, CreateMenuItemRequest } from '@/types/menu';
import { useCreateItem, useUpdateItem } from '@/hooks/useMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const itemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.string().min(1, 'Category is required'),
  dietType: z.enum(['veg', 'non-veg', 'vegan', 'egg']),
  basePrice: z.coerce.number().min(0, 'Price must be positive'),
  displayOrder: z.coerce.number().int().min(0),
  isAvailable: z.boolean(),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface AdminItemFormProps {
  item?: MenuItem | null;
  categories: MenuCategory[];
  defaultCategoryId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AdminItemForm({ item, categories, defaultCategoryId, onSuccess, onCancel }: AdminItemFormProps) {
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const isEditing = !!item;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item?.name || '',
      description: item?.description || '',
      categoryId: item?.categoryId || defaultCategoryId || '',
      dietType: item?.dietType || 'veg',
      basePrice: item?.basePrice || 0,
      displayOrder: item?.displayOrder || 0,
      isAvailable: item?.isAvailable ?? true,
    },
  });

  const isAvailable = watch('isAvailable');
  const selectedCategoryId = watch('categoryId');
  const selectedDietType = watch('dietType');

  const onSubmit = async (data: ItemFormData) => {
    try {
      const payload: CreateMenuItemRequest = {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        dietType: data.dietType,
        basePrice: data.basePrice,
        displayOrder: data.displayOrder,
        isAvailable: data.isAvailable,
      };
      
      if (isEditing && item) {
        await updateItem.mutateAsync({ id: item.id, data: payload });
      } else {
        await createItem.mutateAsync(payload);
      }
      onSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createItem.isPending || updateItem.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Item Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Grilled Chicken Bowl"
          {...register('name')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Item description..."
          {...register('description')}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select
            value={selectedCategoryId}
            onValueChange={(value) => setValue('categoryId', value)}
          >
            <SelectTrigger className={errors.categoryId ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Diet Type *</Label>
          <Select
            value={selectedDietType}
            onValueChange={(value) => setValue('dietType', value as DietType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="veg">Vegetarian</SelectItem>
              <SelectItem value="non-veg">Non-Vegetarian</SelectItem>
              <SelectItem value="vegan">Vegan</SelectItem>
              <SelectItem value="egg">Eggetarian</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="basePrice">Base Price (₹) *</Label>
          <Input
            id="basePrice"
            type="number"
            min={0}
            step={1}
            placeholder="0"
            {...register('basePrice')}
            className={errors.basePrice ? 'border-destructive' : ''}
          />
          {errors.basePrice && <p className="text-sm text-destructive">{errors.basePrice.message}</p>}
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
          <Label htmlFor="isAvailable">Available</Label>
          <p className="text-sm text-muted-foreground">Item can be ordered</p>
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
