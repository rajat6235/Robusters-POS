import { Addon } from '@/types/menu';
import { cn } from '@/lib/utils';
import { Check, Plus } from 'lucide-react';

interface AddonSelectorProps {
  addons: Addon[];
  selectedAddonIds: string[];
  onToggleAddon: (addonId: string) => void;
}

export function AddonSelector({ addons, selectedAddonIds, onToggleAddon }: AddonSelectorProps) {
  if (!addons || addons.length === 0) return null;

  // Group addons by type
  const addonsByType = addons.reduce((acc, addon) => {
    const type = addon.type || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(addon);
    return acc;
  }, {} as Record<string, Addon[]>);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Add-ons</p>
      
      {Object.entries(addonsByType).map(([type, typeAddons]) => (
        <div key={type} className="space-y-2">
          {Object.keys(addonsByType).length > 1 && (
            <p className="text-xs text-muted-foreground/70">{type}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {typeAddons.map((addon) => {
              const isSelected = selectedAddonIds.includes(addon.id);
              const isDisabled = !addon.isAvailable;
              
              return (
                <button
                  key={addon.id}
                  onClick={() => !isDisabled && onToggleAddon(addon.id)}
                  disabled={isDisabled}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200',
                    'border min-w-[80px]',
                    isDisabled && 'opacity-50 cursor-not-allowed',
                    isSelected
                      ? 'bg-accent text-accent-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:border-primary/50'
                  )}
                >
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>{addon.name}</span>
                  <span className="text-xs text-muted-foreground">
                    +₹{addon.price}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
