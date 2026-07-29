'use client';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PackageFormFieldsProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  /** Prefixes element ids so Create and Edit dialogs never collide if both are ever mounted at once. */
  idPrefix?: string;
}

/**
 * Shared name/description/mealCount/price/validityDays fields for the
 * Create and Edit meal package dialogs — kept in one place so the two forms
 * can't drift out of sync with each other.
 */
export function PackageFormFields({ register, errors, idPrefix }: PackageFormFieldsProps) {
  const id = (name: string) => (idPrefix ? `${idPrefix}-${name}` : name);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={id('name')}>
          Package Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id={id('name')}
          placeholder="e.g., 30 Meals Package"
          {...register('name', { required: 'Package name is required' })}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={id('description')}>Description</Label>
        <Textarea
          id={id('description')}
          placeholder="Brief description of the package"
          rows={3}
          {...register('description')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={id('mealCount')}>
            Number of Meals <span className="text-red-500">*</span>
          </Label>
          <Input
            id={id('mealCount')}
            type="number"
            placeholder="30"
            {...register('mealCount', {
              required: 'Meal count is required',
              min: { value: 1, message: 'Must be at least 1' },
            })}
          />
          {errors.mealCount && (
            <p className="text-sm text-red-500">{errors.mealCount.message as string}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={id('price')}>
            Price (₹) <span className="text-red-500">*</span>
          </Label>
          <Input
            id={id('price')}
            type="number"
            step="0.01"
            placeholder="2999.99"
            {...register('price', {
              required: 'Price is required',
              min: { value: 0, message: 'Must be non-negative' },
            })}
          />
          {errors.price && (
            <p className="text-sm text-red-500">{errors.price.message as string}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={id('validityDays')}>Validity (Days)</Label>
        <Input
          id={id('validityDays')}
          type="number"
          placeholder="30 (optional)"
          {...register('validityDays', {
            min: { value: 1, message: 'Must be at least 1 day' },
          })}
        />
        <p className="text-xs text-muted-foreground">Leave empty for no expiry date</p>
        {errors.validityDays && (
          <p className="text-sm text-red-500">{errors.validityDays.message as string}</p>
        )}
      </div>
    </>
  );
}
