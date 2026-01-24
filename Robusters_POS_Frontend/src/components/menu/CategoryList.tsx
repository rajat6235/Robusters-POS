import { MenuCategory } from '@/types/menu';
import { cn } from '@/lib/utils';

interface CategoryListProps {
  categories: MenuCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryList({ categories, selectedCategoryId, onSelectCategory }: CategoryListProps) {
  const sortedCategories = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {sortedCategories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            'flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
            'border-2 whitespace-nowrap',
            selectedCategoryId === category.id
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:bg-accent'
          )}
        >
          {category.name}
          <span className="ml-2 text-xs opacity-70">
            ({category.items?.length || 0})
          </span>
        </button>
      ))}
    </div>
  );
}
