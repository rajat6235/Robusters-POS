/**
 * Menu Seed Script
 * Seeds the database with Robusters Fitness Café menu data.
 * Run with: npm run db:seed-menu
 */

require('dotenv').config();
const db = require('./connection');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const ItemVariant = require('../models/ItemVariant');
const Addon = require('../models/Addon');

// =============================================
// MENU DATA FROM PDF
// =============================================

const categories = [
  { name: 'High Protein Meals', description: 'Salads with your choice of protein source. Adjust portion size based on your daily protein intake.', displayOrder: 1 },
  { name: 'Protein Bowls', description: 'High protein bowls with moderate salad.', displayOrder: 2 },
  { name: 'Burrito Bowls', description: 'Hearty burrito bowls packed with protein.', displayOrder: 3 },
  { name: 'Quinoa Bowls', description: 'Quinoa-based bowls for clean carbs and protein.', displayOrder: 4 },
  { name: 'High Protein & Carb Meals', description: 'Packed with 150g of protein source and 120g of clean carbs.', displayOrder: 5 },
  { name: 'High Fiber Salads', description: 'Packed with natural fiber for better gut health.', displayOrder: 6 },
  { name: 'Eggetarian', description: 'Egg-based dishes for protein lovers.', displayOrder: 7 },
  { name: 'Indian Style Bowls', description: 'Zero oil, no added fat. Mildly spiced with authentic Indian flavors.', displayOrder: 8 },
  { name: 'Healthy Stack', description: '100% wheat wraps, submarines, and grilled sandwiches.', displayOrder: 9 },
  { name: 'Guilt Free Diet', description: 'Whole wheat pasta, spaghetti, and rice noodles with veggies.', displayOrder: 10 },
  { name: 'New Additions', description: 'Fresh additions to our menu.', displayOrder: 11 },
  { name: 'Drinks', description: '100% natural juices, smoothies, and low cal chillers.', displayOrder: 12 },
  { name: 'Make Your Meal', description: 'Your meal, your way. Choose what you love, pay for what you pick.', displayOrder: 13 },
];

// High Protein Meals - with SIZE variants (4oz, 6oz, 8oz)
const highProteinMeals = [
  // VEG
  { name: 'Grilled Paneer', dietType: 'VEG', variants: [{ name: '4oz', price: 180 }, { name: '6oz', price: 210 }, { name: '8oz', price: 240 }] },
  { name: 'Malaysian Paneer', dietType: 'VEG', variants: [{ name: '4oz', price: 200 }, { name: '6oz', price: 230 }, { name: '8oz', price: 250 }] },
  { name: 'Robusted Paneer', dietType: 'VEG', variants: [{ name: '4oz', price: 220 }, { name: '6oz', price: 250 }, { name: '8oz', price: 280 }] },
  // NON VEG
  { name: 'Steamed Chk Breast', dietType: 'NON_VEG', variants: [{ name: '4oz', price: 150 }, { name: '6oz', price: 180 }, { name: '8oz', price: 210 }] },
  { name: 'Grilled Chk Breast', dietType: 'NON_VEG', variants: [{ name: '4oz', price: 180 }, { name: '6oz', price: 210 }, { name: '8oz', price: 240 }] },
  { name: 'Malaysian Chk Breast', dietType: 'NON_VEG', variants: [{ name: '4oz', price: 220 }, { name: '6oz', price: 250 }, { name: '8oz', price: 280 }] },
  { name: 'Robusted Chk Breast', dietType: 'NON_VEG', variants: [{ name: '4oz', price: 240 }, { name: '6oz', price: 270 }, { name: '8oz', price: 300 }] },
  { name: 'Grilled Chk Thigh', dietType: 'NON_VEG', variants: [{ name: '4oz', price: 240 }, { name: '6oz', price: 270 }, { name: '8oz', price: 300 }] },
  { name: 'Grilled Fish', dietType: 'NON_VEG', variants: [{ name: '4oz', price: 280 }, { name: '6oz', price: 320 }, { name: '8oz', price: 360 }] },
];

// Protein Bowls - with PORTION variants (Half, Full)
const proteinBowls = [
  { name: 'Vegan Protein Bowl', dietType: 'VEGAN', variants: [{ name: 'Half', price: 110 }, { name: 'Full', price: 220 }] },
  { name: 'Veg Protein Bowl', dietType: 'VEG', variants: [{ name: 'Half', price: 150 }, { name: 'Full', price: 250 }] },
  { name: 'Non Veg Protein Bowl', dietType: 'NON_VEG', variants: [{ name: 'Half', price: 160 }, { name: 'Full', price: 260 }] },
];

// Burrito Bowls
const burritoBowls = [
  { name: 'Veg Burrito Bowl', dietType: 'VEG', variants: [{ name: 'Half', price: 170 }, { name: 'Full', price: 300 }] },
  { name: 'Non Veg Burrito Bowl', dietType: 'NON_VEG', variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 320 }] },
];

// Quinoa Bowls
const quinoaBowls = [
  { name: 'Veg Quinoa Bowl', dietType: 'VEG', variants: [{ name: 'Half', price: 190 }, { name: 'Full', price: 330 }] },
  { name: 'Non Veg Quinoa Bowl', dietType: 'NON_VEG', variants: [{ name: 'Half', price: 200 }, { name: 'Full', price: 350 }] },
];

// High Protein & Carb Meals - with CARB_TYPE variants (Brown Rice, Quinoa)
const highProteinCarbMeals = [
  // VEGAN
  { name: 'Rice and Salad', dietType: 'VEGAN', variants: [{ name: 'Brown Rice', price: 150 }, { name: 'Quinoa', price: 180 }] },
  { name: 'Mixed Beans and Rice', dietType: 'VEGAN', variants: [{ name: 'Brown Rice', price: 170 }, { name: 'Quinoa', price: 200 }] },
  { name: 'Tofu with Rice', dietType: 'VEGAN', variants: [{ name: 'Brown Rice', price: 190 }, { name: 'Quinoa', price: 220 }] },
  // VEG
  { name: 'Grilled Paneer with Rice', dietType: 'VEG', variants: [{ name: 'Brown Rice', price: 250 }, { name: 'Quinoa', price: 280 }] },
  { name: 'Malaysian Paneer with Rice', dietType: 'VEG', variants: [{ name: 'Brown Rice', price: 270 }, { name: 'Quinoa', price: 300 }] },
  { name: 'Robusted Paneer with Rice', dietType: 'VEG', variants: [{ name: 'Brown Rice', price: 300 }, { name: 'Quinoa', price: 330 }] },
  // NON VEG
  { name: 'Grilled Chest with Rice', dietType: 'NON_VEG', variants: [{ name: 'Brown Rice', price: 270 }, { name: 'Quinoa', price: 300 }] },
  { name: 'Malaysian Chest with Rice', dietType: 'NON_VEG', variants: [{ name: 'Brown Rice', price: 290 }, { name: 'Quinoa', price: 320 }] },
  { name: 'Robusted Chest with Rice', dietType: 'NON_VEG', variants: [{ name: 'Brown Rice', price: 320 }, { name: 'Quinoa', price: 350 }] },
  { name: 'Grilled Thigh with Rice', dietType: 'NON_VEG', variants: [{ name: 'Brown Rice', price: 370 }, { name: 'Quinoa', price: 400 }] },
  { name: 'Fish and Rice Meal', dietType: 'NON_VEG', variants: [{ name: 'Brown Rice', price: 400 }, { name: 'Quinoa', price: 430 }] },
];

// High Fiber Salads - no variants
const highFiberSalads = [
  // VEG
  { name: 'Greek Salad', dietType: 'VEG', basePrice: 190 },
  { name: 'Grilled Paneer Salad', dietType: 'VEG', basePrice: 230 },
  { name: 'Tofu Salad', dietType: 'VEGAN', basePrice: 170 },
  { name: 'Mixed Beans Salad', dietType: 'VEGAN', basePrice: 160 },
  { name: 'Pure Fiber', dietType: 'VEGAN', basePrice: 200 },
  { name: 'Pineapple Salsa Salad', dietType: 'VEG', basePrice: 210 },
  // NON VEG
  { name: 'Egg White Salad', dietType: 'EGGETARIAN', basePrice: 170 },
  { name: 'Chicken Greek Salad', dietType: 'NON_VEG', basePrice: 220 },
  { name: 'Grilled Breast Salad', dietType: 'NON_VEG', basePrice: 230 },
  { name: 'Grilled Thigh Salad', dietType: 'NON_VEG', basePrice: 250 },
  { name: 'Grilled Fish Salad', dietType: 'NON_VEG', basePrice: 280 },
];

// Eggetarian items
const eggetarianItems = [
  { name: 'Yolk Lover (5 Whole Eggs)', dietType: 'EGGETARIAN', basePrice: 200, description: 'Slow-cooked eggs over fresh veggies' },
  { name: 'All White (9 Egg Whites)', dietType: 'EGGETARIAN', basePrice: 230, description: 'Slow-cooked egg whites over fresh veggies' },
  { name: 'Russian Eggs', dietType: 'NON_VEG', basePrice: 250, description: 'Five eggs with 100g chicken breast' },
];

// Indian Style Bowls
const indianStyleBowls = [
  { name: 'Vegan Quinoa Bowl (Indian)', dietType: 'VEGAN', basePrice: 160, description: '150G quinoa with gravy and sauté veggie' },
  { name: 'Eggitarian Quinoa Bowl', dietType: 'EGGETARIAN', basePrice: 180, description: '4 boiled egg whites with 150G quinoa and salad' },
  { name: 'Veg Quinoa Bowl (Indian)', dietType: 'VEG', basePrice: 240, description: '100G paneer with gravy, 150G quinoa and salad' },
  { name: 'Non Veg Quinoa Bowl (Indian)', dietType: 'NON_VEG', basePrice: 260, description: '100G chicken breast with gravy and 150G quinoa' },
  { name: 'Vegan Brown Rice Bowl', dietType: 'VEGAN', basePrice: 140, description: '150G brown rice with gravy and sauté veggie' },
  { name: 'Eggitarian Brown Rice Bowl', dietType: 'EGGETARIAN', basePrice: 160, description: '4 boiled egg whites with 150G rice and salad' },
  { name: 'Veg Brown Rice Bowl', dietType: 'VEG', basePrice: 220, description: '100G paneer with gravy, 150G rice and salad' },
  { name: 'Non Veg Brown Rice Bowl', dietType: 'NON_VEG', basePrice: 240, description: '100G chicken breast with gravy and 150G rice' },
];

// Healthy Stack - Wraps
const healthyStackWraps = [
  { name: 'Mixed Beans Wrap', dietType: 'VEGAN', basePrice: 100, description: '80g nutrition base' },
  { name: 'Tofu Wrap', dietType: 'VEGAN', basePrice: 120, description: '80g nutrition base' },
  { name: 'Grilled Paneer Wrap', dietType: 'VEG', basePrice: 160, description: '80g nutrition base' },
  { name: 'Steamed Chk Breast Wrap', dietType: 'NON_VEG', basePrice: 160, description: '80g nutrition base' },
  { name: 'Grilled Chk Breast Wrap', dietType: 'NON_VEG', basePrice: 170, description: '80g nutrition base' },
  { name: 'Grilled Chk Thigh Wrap', dietType: 'NON_VEG', basePrice: 190, description: '80g nutrition base' },
];

// Submarines
const submarines = [
  { name: 'Herbaceous Submarine', dietType: 'VEG', basePrice: 130, description: '100g nutrition base' },
  { name: 'Grilled Paneer Submarine', dietType: 'VEG', basePrice: 170, description: '100g nutrition base' },
  { name: 'Grilled Tofu Submarine', dietType: 'VEGAN', basePrice: 160, description: '100g nutrition base' },
  { name: 'Chk Breast Submarine', dietType: 'NON_VEG', basePrice: 180, description: '100g nutrition base' },
  { name: 'Chk Thigh Submarine', dietType: 'NON_VEG', basePrice: 200, description: '100g nutrition base' },
];

// Grilled Sandwiches
const grilledSandwiches = [
  { name: 'Vegan Delite Sandwich', dietType: 'VEGAN', basePrice: 100, description: '100g nutrition base' },
  { name: 'Grilled Paneer Sandwich', dietType: 'VEG', basePrice: 150, description: '100g nutrition base' },
  { name: 'Grilled Chk Breast Sandwich', dietType: 'NON_VEG', basePrice: 170, description: '100g nutrition base' },
  { name: 'Grilled Chk Thigh Sandwich', dietType: 'NON_VEG', basePrice: 190, description: '100g nutrition base' },
];

// Guilt Free Diet - with PORTION variants
const guiltFreeDiet = [
  { name: 'Whole Wheat Pasta', dietType: 'VEG', variants: [{ name: 'Half', price: 130 }, { name: 'Full', price: 200 }] },
  { name: 'Whole Wheat Spaghetti', dietType: 'VEG', variants: [{ name: 'Half', price: 130 }, { name: 'Full', price: 200 }] },
  { name: 'Rice Noodles', dietType: 'VEG', variants: [{ name: 'Half', price: 140 }, { name: 'Full', price: 220 }] },
];

// New Additions
const newAdditions = [
  { name: 'Leg Quarter', dietType: 'NON_VEG', basePrice: 180, description: 'With sauté veg' },
  { name: 'Double Leg Quarters', dietType: 'NON_VEG', basePrice: 280, description: 'With sauté veg' },
  { name: 'Avocado Toast', dietType: 'VEG', basePrice: 350, description: 'With sauté veg' },
  { name: 'Avocado Toast with Egg Whites', dietType: 'EGGETARIAN', basePrice: 380, description: 'With two egg whites and sauté veg' },
  { name: 'Sunny Side Up Meal', dietType: 'EGGETARIAN', basePrice: 70 },
];

// Drinks
const drinks = [
  // Natural Juices
  { name: 'Energy Booster', dietType: 'VEGAN', basePrice: 130, description: 'Beet root, carrot, apple, lemon & ginger' },
  { name: 'Detox Green', dietType: 'VEGAN', basePrice: 130, description: 'Cucumber, spinach, lemon, ginger & coconut' },
  { name: 'Immunity Booster', dietType: 'VEGAN', basePrice: 130, description: 'Orange, carrot, ginger, lemon & turmeric' },
  { name: 'Hydrater', dietType: 'VEGAN', basePrice: 130, description: 'Orange, cucumber, ginger, lemon, coconut & honey' },
  { name: 'Detoxifier', dietType: 'VEGAN', basePrice: 70 },
  // Smoothies
  { name: 'Peanut Butter Banana', dietType: 'VEG', basePrice: 110, description: 'Peanut butter, banana & low fat milk' },
  { name: 'Brutes Gainer', dietType: 'VEG', basePrice: 140, description: 'Peanut butter, oats, banana & low fat milk' },
  { name: 'Egg Smoothie', dietType: 'EGGETARIAN', basePrice: 100, description: 'Made of 7 boiled egg whites' },
  { name: 'Bournvita Smoothie', dietType: 'VEG', basePrice: 120 },
  { name: 'Peanut Butter Egg Smoothie', dietType: 'EGGETARIAN', basePrice: 150 },
  { name: 'Cold Coffee', dietType: 'VEG', basePrice: 90 },
  // Natural Smoothies
  { name: 'Lemonade', dietType: 'VEGAN', basePrice: 70 },
  { name: 'Lemon Soda', dietType: 'VEGAN', basePrice: 80 },
  { name: 'Beet Punch', dietType: 'VEGAN', basePrice: 120 },
  { name: 'Popeyes Smoothie', dietType: 'VEGAN', basePrice: 120, description: 'Spinach green powerhouse' },
  { name: 'Apple Mint', dietType: 'VEGAN', basePrice: 120, description: 'Crisp apple and cucumber with mint' },
  // Low Kcal Chillers
  { name: 'Mojito', dietType: 'VEGAN', basePrice: 120 },
  { name: 'Green Apple Chiller', dietType: 'VEGAN', basePrice: 120 },
  { name: 'Blue Berry Chiller', dietType: 'VEGAN', basePrice: 120 },
  { name: 'Masala Mango Chiller', dietType: 'VEGAN', basePrice: 120 },
  { name: 'Orange Chiller', dietType: 'VEGAN', basePrice: 120 },
];

// Add-ons
const addons = [
  // For High Protein Meals
  { name: 'Mixed Beans', price: 50, unit: '100g', unitQuantity: 100, addonGroup: 'proteins' },
  { name: 'Quinoa', price: 60, unit: '100g', unitQuantity: 100, addonGroup: 'carbs' },
  { name: 'Brown Rice', price: 40, unit: '100g', unitQuantity: 100, addonGroup: 'carbs' },
  { name: 'Egg', price: 15, unit: 'piece', addonGroup: 'proteins' },
  // For Guilt Free Diet
  { name: '100G Chk Breast', price: 100, unit: '100g', unitQuantity: 100, addonGroup: 'proteins' },
  { name: '100G Cottage Cheese', price: 80, unit: '100g', unitQuantity: 100, addonGroup: 'proteins' },
  // Make Your Meal - Proteins
  { name: 'Tofu', price: 50, unit: '100g', unitQuantity: 100, addonGroup: 'proteins' },
  { name: 'Grilled Paneer', price: 100, unit: '100g', unitQuantity: 100, addonGroup: 'proteins' },
  { name: 'Boiled Egg', price: 15, unit: 'piece', addonGroup: 'proteins' },
  { name: 'Sunny Side Up Egg', price: 30, unit: 'piece', addonGroup: 'proteins' },
  { name: 'Steamed Chk Breast', price: 80, unit: '100g', unitQuantity: 100, addonGroup: 'proteins' },
  { name: 'Grilled Chk Breast', price: 110, unit: '100g', unitQuantity: 100, addonGroup: 'proteins' },
  { name: 'Grilled Chk Thigh', price: 130, unit: '100g', unitQuantity: 100, addonGroup: 'proteins' },
  { name: 'Grilled Fish', price: 150, unit: '100g', unitQuantity: 100, addonGroup: 'proteins' },
  // Salads
  { name: 'Small Salad', price: 80, unit: 'serving', addonGroup: 'salads' },
  { name: 'Medium Salad', price: 160, unit: 'serving', addonGroup: 'salads' },
  { name: 'Large Salad', price: 200, unit: 'serving', addonGroup: 'salads' },
  { name: 'Extra Broccoli', price: 50, unit: 'serving', addonGroup: 'extras' },
  // Dressings
  { name: 'Olive Oil and Lemon Dressing', price: 40, unit: 'serving', addonGroup: 'dressings' },
  { name: 'Coriander Dressing', price: 50, unit: 'serving', addonGroup: 'dressings' },
  { name: 'Lemon Dressing', price: 20, unit: 'serving', addonGroup: 'dressings' },
  { name: 'Teriyaki Dressing', price: 50, unit: 'serving', addonGroup: 'dressings' },
  { name: 'Asian Ginger Dressing', price: 80, unit: 'serving', addonGroup: 'dressings' },
  { name: 'Vinaigrette Dressing', price: 40, unit: 'serving', addonGroup: 'dressings' },
  { name: 'Mediterranean Dressing', price: 40, unit: 'serving', addonGroup: 'dressings' },
  { name: 'Single Dip', price: 15, unit: 'serving', addonGroup: 'dressings' },
  { name: 'Three Sauce Dressing', price: 40, unit: 'serving', addonGroup: 'dressings' },
];

// =============================================
// SEED FUNCTION
// =============================================

async function seedMenu() {
  try {
    console.log('Starting menu seeding...\n');

    // Test connection
    const connected = await db.testConnection();
    if (!connected) {
      throw new Error('Cannot connect to database. Run "npm run db:init" first.');
    }

    // Create categories
    console.log('Creating categories...');
    const categoryMap = {};
    for (const cat of categories) {
      const created = await Category.create(cat);
      categoryMap[cat.name] = created.id;
      console.log(`  Created: ${cat.name}`);
    }

    // Helper to create items with variants
    const createItemsWithVariants = async (categoryName, items, variantType) => {
      const categoryId = categoryMap[categoryName];
      console.log(`\nCreating items for ${categoryName}...`);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const hasVariants = !!item.variants;

        const created = await MenuItem.create({
          categoryId,
          name: item.name,
          description: item.description,
          dietType: item.dietType,
          basePrice: item.basePrice,
          hasVariants,
          variantType: hasVariants ? variantType : null,
          displayOrder: i,
        });

        if (hasVariants) {
          await ItemVariant.createBulk(
            created.id,
            item.variants.map((v, idx) => ({ ...v, displayOrder: idx }))
          );
        }

        console.log(`  Created: ${item.name}`);
      }
    };

    // Create menu items by category
    await createItemsWithVariants('High Protein Meals', highProteinMeals, 'SIZE');
    await createItemsWithVariants('Protein Bowls', proteinBowls, 'PORTION');
    await createItemsWithVariants('Burrito Bowls', burritoBowls, 'PORTION');
    await createItemsWithVariants('Quinoa Bowls', quinoaBowls, 'PORTION');
    await createItemsWithVariants('High Protein & Carb Meals', highProteinCarbMeals, 'CARB_TYPE');
    await createItemsWithVariants('High Fiber Salads', highFiberSalads, null);
    await createItemsWithVariants('Eggetarian', eggetarianItems, null);
    await createItemsWithVariants('Indian Style Bowls', indianStyleBowls, null);

    // Healthy Stack - combine wraps, submarines, sandwiches
    const healthyStackId = categoryMap['Healthy Stack'];
    console.log('\nCreating items for Healthy Stack...');
    let orderIdx = 0;

    for (const item of healthyStackWraps) {
      await MenuItem.create({ ...item, categoryId: healthyStackId, displayOrder: orderIdx++ });
      console.log(`  Created: ${item.name}`);
    }
    for (const item of submarines) {
      await MenuItem.create({ ...item, categoryId: healthyStackId, displayOrder: orderIdx++ });
      console.log(`  Created: ${item.name}`);
    }
    for (const item of grilledSandwiches) {
      await MenuItem.create({ ...item, categoryId: healthyStackId, displayOrder: orderIdx++ });
      console.log(`  Created: ${item.name}`);
    }

    await createItemsWithVariants('Guilt Free Diet', guiltFreeDiet, 'PORTION');
    await createItemsWithVariants('New Additions', newAdditions, null);
    await createItemsWithVariants('Drinks', drinks, null);

    // Create add-ons
    console.log('\nCreating add-ons...');
    const addonMap = {};
    for (let i = 0; i < addons.length; i++) {
      const addon = addons[i];
      const created = await Addon.create({ ...addon, displayOrder: i });
      addonMap[addon.name] = created.id;
      console.log(`  Created: ${addon.name}`);
    }

    // Link addons to categories
    console.log('\nLinking add-ons to categories...');

    // High Protein Meals addons
    const highProteinAddons = ['Mixed Beans', 'Quinoa', 'Brown Rice', 'Egg'];
    for (const name of highProteinAddons) {
      await Addon.linkToCategory(categoryMap['High Protein Meals'], addonMap[name]);
    }
    console.log('  Linked addons to High Protein Meals');

    // Guilt Free Diet addons
    const guiltFreeAddons = ['100G Chk Breast', '100G Cottage Cheese', 'Egg'];
    for (const name of guiltFreeAddons) {
      await Addon.linkToCategory(categoryMap['Guilt Free Diet'], addonMap[name]);
    }
    console.log('  Linked addons to Guilt Free Diet');

    // Make Your Meal - link all relevant addons
    const makeYourMealAddons = [
      'Tofu', 'Mixed Beans', 'Grilled Paneer', 'Boiled Egg', 'Sunny Side Up Egg',
      'Steamed Chk Breast', 'Grilled Chk Breast', 'Grilled Chk Thigh', 'Grilled Fish',
      'Small Salad', 'Medium Salad', 'Large Salad', 'Extra Broccoli',
      'Quinoa', 'Brown Rice',
      'Olive Oil and Lemon Dressing', 'Coriander Dressing', 'Lemon Dressing',
      'Teriyaki Dressing', 'Asian Ginger Dressing', 'Vinaigrette Dressing',
      'Mediterranean Dressing', 'Single Dip', 'Three Sauce Dressing',
    ];
    for (const name of makeYourMealAddons) {
      if (addonMap[name]) {
        await Addon.linkToCategory(categoryMap['Make Your Meal'], addonMap[name]);
      }
    }
    console.log('  Linked addons to Make Your Meal');

    await db.closePool();
    console.log('\n✅ Menu seeding complete!');
    console.log('\nSummary:');
    console.log(`  Categories: ${categories.length}`);
    console.log(`  Add-ons: ${addons.length}`);

  } catch (error) {
    console.error('Menu seeding failed:', error.message);
    console.error(error.stack);
    await db.closePool();
    process.exit(1);
  }
}

seedMenu();
