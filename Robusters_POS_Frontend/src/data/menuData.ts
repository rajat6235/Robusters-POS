import { MenuCategory, MenuItem, AddOn } from '@/types';

// Global Add-ons
export const globalAddOns: AddOn[] = [
  { id: 'addon-1', name: 'Mixed Beans', price: 50, quantity: '100g' },
  { id: 'addon-2', name: 'Quinoa', price: 60, quantity: '100g' },
  { id: 'addon-3', name: 'Brown Rice', price: 40, quantity: '100g' },
  { id: 'addon-4', name: 'Egg', price: 15, quantity: '1 pc' },
  { id: 'addon-5', name: 'Chicken Breast', price: 100, quantity: '100g' },
  { id: 'addon-6', name: 'Cottage Cheese', price: 80, quantity: '100g' },
];

// Menu Items by Category
export const menuCategories: MenuCategory[] = [
  {
    id: 'cat-1',
    name: 'Protein Bowls',
    description: 'High protein meals with moderate salad',
    sortOrder: 1,
    items: [
      {
        id: 'item-1',
        name: 'Vegan Protein Bowl',
        categoryId: 'cat-1',
        dietType: 'vegan',
        portions: [
          { id: 'p1', name: 'Regular', size: '110g', price: 110 },
          { id: 'p2', name: 'Large', size: '220g', price: 220 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-2',
        name: 'Veg Protein Bowl',
        categoryId: 'cat-1',
        dietType: 'veg',
        portions: [
          { id: 'p1', name: 'Regular', size: '150g', price: 150 },
          { id: 'p2', name: 'Large', size: '250g', price: 250 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-3',
        name: 'Non-Veg Protein Bowl',
        categoryId: 'cat-1',
        dietType: 'non-veg',
        portions: [
          { id: 'p1', name: 'Regular', size: '160g', price: 160 },
          { id: 'p2', name: 'Large', size: '260g', price: 260 },
        ],
        isAvailable: true,
      },
    ],
  },
  {
    id: 'cat-2',
    name: 'Burrito Bowls',
    description: 'Mexican-style healthy bowls',
    sortOrder: 2,
    items: [
      {
        id: 'item-4',
        name: 'Veg Burrito Bowl',
        categoryId: 'cat-2',
        dietType: 'veg',
        portions: [
          { id: 'p1', name: 'Regular', size: '170g', price: 170 },
          { id: 'p2', name: 'Large', size: '300g', price: 300 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-5',
        name: 'Non-Veg Burrito Bowl',
        categoryId: 'cat-2',
        dietType: 'non-veg',
        portions: [
          { id: 'p1', name: 'Regular', size: '180g', price: 180 },
          { id: 'p2', name: 'Large', size: '320g', price: 320 },
        ],
        isAvailable: true,
      },
    ],
  },
  {
    id: 'cat-3',
    name: 'Salads',
    description: 'Fresh, fiber-rich salads',
    sortOrder: 3,
    items: [
      {
        id: 'item-6',
        name: 'Grilled Paneer Salad',
        categoryId: 'cat-3',
        dietType: 'veg',
        portions: [
          { id: 'p1', name: '4oz', size: '4oz', price: 180 },
          { id: 'p2', name: '6oz', size: '6oz', price: 210 },
          { id: 'p3', name: '8oz', size: '8oz', price: 240 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-7',
        name: 'Malaysian Paneer Salad',
        categoryId: 'cat-3',
        dietType: 'veg',
        portions: [
          { id: 'p1', name: '4oz', size: '4oz', price: 200 },
          { id: 'p2', name: '6oz', size: '6oz', price: 230 },
          { id: 'p3', name: '8oz', size: '8oz', price: 250 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-8',
        name: 'Robusted Paneer Salad',
        categoryId: 'cat-3',
        dietType: 'veg',
        portions: [
          { id: 'p1', name: '4oz', size: '4oz', price: 220 },
          { id: 'p2', name: '6oz', size: '6oz', price: 250 },
          { id: 'p3', name: '8oz', size: '8oz', price: 280 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-9',
        name: 'Steamed Chicken Breast Salad',
        categoryId: 'cat-3',
        dietType: 'non-veg',
        portions: [
          { id: 'p1', name: '4oz', size: '4oz', price: 150 },
          { id: 'p2', name: '6oz', size: '6oz', price: 180 },
          { id: 'p3', name: '8oz', size: '8oz', price: 210 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-10',
        name: 'Grilled Chicken Breast Salad',
        categoryId: 'cat-3',
        dietType: 'non-veg',
        portions: [
          { id: 'p1', name: '4oz', size: '4oz', price: 180 },
          { id: 'p2', name: '6oz', size: '6oz', price: 210 },
          { id: 'p3', name: '8oz', size: '8oz', price: 240 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-11',
        name: 'Grilled Fish Salad',
        categoryId: 'cat-3',
        dietType: 'non-veg',
        portions: [
          { id: 'p1', name: '4oz', size: '4oz', price: 280 },
          { id: 'p2', name: '6oz', size: '6oz', price: 320 },
          { id: 'p3', name: '8oz', size: '8oz', price: 360 },
        ],
        isAvailable: true,
      },
    ],
  },
  {
    id: 'cat-4',
    name: 'Rice & Carb Meals',
    description: 'High fiber, protein-packed carb meals',
    sortOrder: 4,
    items: [
      {
        id: 'item-12',
        name: 'Brown Rice and Salad',
        categoryId: 'cat-4',
        dietType: 'vegan',
        portions: [
          { id: 'p1', name: 'Regular', size: '150g', price: 150 },
          { id: 'p2', name: 'Large', size: '180g', price: 180 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-13',
        name: 'Grilled Paneer with Rice',
        categoryId: 'cat-4',
        dietType: 'veg',
        portions: [
          { id: 'p1', name: 'Regular', size: '250g', price: 250 },
          { id: 'p2', name: 'Large', size: '280g', price: 280 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-14',
        name: 'Grilled Chicken with Rice',
        categoryId: 'cat-4',
        dietType: 'non-veg',
        portions: [
          { id: 'p1', name: 'Regular', size: '270g', price: 270 },
          { id: 'p2', name: 'Large', size: '300g', price: 300 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-15',
        name: 'Fish and Rice Meal',
        categoryId: 'cat-4',
        dietType: 'non-veg',
        portions: [
          { id: 'p1', name: 'Regular', size: '400g', price: 400 },
          { id: 'p2', name: 'Large', size: '430g', price: 430 },
        ],
        isAvailable: true,
      },
    ],
  },
  {
    id: 'cat-5',
    name: 'Eggetarian',
    description: 'Egg-based protein meals',
    sortOrder: 5,
    items: [
      {
        id: 'item-16',
        name: 'Yolk Lover (5 Whole Eggs)',
        categoryId: 'cat-5',
        dietType: 'egg',
        portions: [{ id: 'p1', name: 'Standard', size: '5 eggs', price: 200 }],
        isAvailable: true,
      },
      {
        id: 'item-17',
        name: 'All White (9 Egg Whites)',
        categoryId: 'cat-5',
        dietType: 'egg',
        portions: [{ id: 'p1', name: 'Standard', size: '9 whites', price: 230 }],
        isAvailable: true,
      },
      {
        id: 'item-18',
        name: 'Russian Eggs',
        description: 'Five eggs — three whole, stuffed with tender 100g chicken breast',
        categoryId: 'cat-5',
        dietType: 'egg',
        portions: [{ id: 'p1', name: 'Standard', size: '5 eggs + chicken', price: 250 }],
        isAvailable: true,
      },
    ],
  },
  {
    id: 'cat-6',
    name: 'Wraps & Sandwiches',
    description: '100% Wheat wraps and grilled sandwiches',
    sortOrder: 6,
    items: [
      {
        id: 'item-19',
        name: 'Grilled Paneer Wrap',
        categoryId: 'cat-6',
        dietType: 'veg',
        portions: [{ id: 'p1', name: 'Standard', size: '80g protein', price: 160 }],
        isAvailable: true,
      },
      {
        id: 'item-20',
        name: 'Grilled Chicken Breast Wrap',
        categoryId: 'cat-6',
        dietType: 'non-veg',
        portions: [{ id: 'p1', name: 'Standard', size: '80g protein', price: 170 }],
        isAvailable: true,
      },
      {
        id: 'item-21',
        name: 'Vegan Delite Sandwich',
        categoryId: 'cat-6',
        dietType: 'vegan',
        portions: [{ id: 'p1', name: 'Standard', size: '100g', price: 100 }],
        isAvailable: true,
      },
      {
        id: 'item-22',
        name: 'Grilled Paneer Sandwich',
        categoryId: 'cat-6',
        dietType: 'veg',
        portions: [{ id: 'p1', name: 'Standard', size: '100g', price: 150 }],
        isAvailable: true,
      },
    ],
  },
  {
    id: 'cat-7',
    name: 'Pasta & Noodles',
    description: 'Guilt-free whole wheat pasta and rice noodles',
    sortOrder: 7,
    items: [
      {
        id: 'item-23',
        name: 'Whole Wheat Pasta',
        categoryId: 'cat-7',
        dietType: 'veg',
        portions: [
          { id: 'p1', name: 'Half', size: 'Half', price: 130 },
          { id: 'p2', name: 'Full', size: 'Full', price: 200 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-24',
        name: 'Whole Wheat Spaghetti',
        categoryId: 'cat-7',
        dietType: 'veg',
        portions: [
          { id: 'p1', name: 'Half', size: 'Half', price: 130 },
          { id: 'p2', name: 'Full', size: 'Full', price: 200 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-25',
        name: 'Rice Noodles',
        categoryId: 'cat-7',
        dietType: 'veg',
        portions: [
          { id: 'p1', name: 'Half', size: 'Half', price: 140 },
          { id: 'p2', name: 'Full', size: 'Full', price: 220 },
        ],
        isAvailable: true,
      },
    ],
  },
  {
    id: 'cat-8',
    name: 'Drinks & Smoothies',
    description: '100% Natural juices and smoothies',
    sortOrder: 8,
    items: [
      {
        id: 'item-26',
        name: 'Energy Booster',
        description: 'Beetroot, carrot, apple, lemon & ginger',
        categoryId: 'cat-8',
        dietType: 'vegan',
        portions: [{ id: 'p1', name: 'Glass', size: '300ml', price: 130 }],
        isAvailable: true,
      },
      {
        id: 'item-27',
        name: 'Detox Green',
        description: 'Cucumber, spinach, lemon, ginger & coconut',
        categoryId: 'cat-8',
        dietType: 'vegan',
        portions: [{ id: 'p1', name: 'Glass', size: '300ml', price: 130 }],
        isAvailable: true,
      },
      {
        id: 'item-28',
        name: 'Immunity Booster',
        description: 'Orange, carrot, ginger, lemon & turmeric',
        categoryId: 'cat-8',
        dietType: 'vegan',
        portions: [{ id: 'p1', name: 'Glass', size: '300ml', price: 130 }],
        isAvailable: true,
      },
      {
        id: 'item-29',
        name: 'Peanut Butter Egg Smoothie',
        description: 'Made with 7 boiled egg whites',
        categoryId: 'cat-8',
        dietType: 'egg',
        portions: [{ id: 'p1', name: 'Glass', size: '400ml', price: 150 }],
        isAvailable: true,
      },
      {
        id: 'item-30',
        name: 'Cold Coffee',
        categoryId: 'cat-8',
        dietType: 'veg',
        portions: [{ id: 'p1', name: 'Glass', size: '300ml', price: 90 }],
        isAvailable: true,
      },
      {
        id: 'item-31',
        name: 'Lemonade',
        categoryId: 'cat-8',
        dietType: 'vegan',
        portions: [{ id: 'p1', name: 'Glass', size: '300ml', price: 70 }],
        isAvailable: true,
      },
    ],
  },
  {
    id: 'cat-9',
    name: 'New Additions',
    description: 'Latest menu items',
    sortOrder: 9,
    items: [
      {
        id: 'item-32',
        name: 'Leg Quarter with Sauté Veg',
        categoryId: 'cat-9',
        dietType: 'non-veg',
        portions: [
          { id: 'p1', name: 'Single', size: '1 pc', price: 180 },
          { id: 'p2', name: 'Double', size: '2 pc', price: 280 },
        ],
        isAvailable: true,
      },
      {
        id: 'item-33',
        name: 'Avocado Toast',
        categoryId: 'cat-9',
        dietType: 'vegan',
        portions: [{ id: 'p1', name: 'Standard', size: 'with sauté veg', price: 350 }],
        isAvailable: true,
      },
      {
        id: 'item-34',
        name: 'Avocado Toast with Egg Whites',
        categoryId: 'cat-9',
        dietType: 'egg',
        portions: [{ id: 'p1', name: 'Standard', size: 'with 2 egg whites', price: 380 }],
        isAvailable: true,
      },
    ],
  },
];

// Helper to get all items flat
export const getAllMenuItems = (): MenuItem[] => {
  return menuCategories.flatMap((cat) => cat.items);
};

// Helper to get item by ID
export const getMenuItemById = (id: string): MenuItem | undefined => {
  return getAllMenuItems().find((item) => item.id === id);
};
