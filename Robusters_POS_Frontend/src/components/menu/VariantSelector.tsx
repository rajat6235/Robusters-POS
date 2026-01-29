import { Variant } from '@/types/menu';
import { cn } from '@/lib/utils';

interface VariantSelectorProps {
  variants: Variant[];
  selectedVariantId: string | null;
  onSelectVariant: (variantId: string) => void;
}

export function VariantSelector({ variants, selectedVariantId, onSelectVariant }: VariantSelectorProps) {
  if (!variants || variants.length === 0) return null;

  const sortedVariants = [...variants].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Variants</p>
      <div className="flex flex-wrap gap-2">
        {sortedVariants.map((variant) => (
          <button
            key={variant.id}
            onClick={() => onSelectVariant(variant.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
              'border min-w-[60px]',
              selectedVariantId === variant.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:border-primary/50'
            )}
          >
            <span>{variant.name}</span>
            <span className="ml-1 text-xs opacity-80">₹{variant.price}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
