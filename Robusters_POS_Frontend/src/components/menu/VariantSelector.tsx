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

  // Group variants by type for better display
  const variantsByType = sortedVariants.reduce((acc, variant) => {
    const type = variant.type || 'SIZE';
    if (!acc[type]) acc[type] = [];
    acc[type].push(variant);
    return acc;
  }, {} as Record<string, Variant[]>);

  const typeLabels: Record<string, string> = {
    SIZE: 'Size',
    PORTION: 'Portion',
    CARB_TYPE: 'Carb Type',
    PROTEIN_TYPE: 'Protein',
  };

  return (
    <div className="space-y-3">
      {Object.entries(variantsByType).map(([type, typeVariants]) => (
        <div key={type}>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {typeLabels[type] || type}
          </p>
          <div className="flex flex-wrap gap-2">
            {typeVariants.map((variant) => (
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
      ))}
    </div>
  );
}
