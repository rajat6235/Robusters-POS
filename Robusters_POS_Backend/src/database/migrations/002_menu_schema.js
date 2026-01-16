/**
 * Menu System Database Schema
 *
 * Designed for Robusters Fitness Café POS
 * Supports: Categories, Items, Variants (size/portion), Add-ons
 */

const createMenuSchema = `
-- =============================================
-- ENUM TYPES
-- =============================================

-- Variant types for menu items
DO $$ BEGIN
    CREATE TYPE variant_type AS ENUM ('SIZE', 'PORTION', 'CARB_TYPE', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Diet type for items
DO $$ BEGIN
    CREATE TYPE diet_type AS ENUM ('VEGAN', 'VEG', 'EGGETARIAN', 'NON_VEG');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- CATEGORIES TABLE
-- =============================================
-- Stores menu categories like "High Protein Meals", "Drinks", etc.

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

-- =============================================
-- MENU ITEMS TABLE
-- =============================================
-- Stores individual menu items like "Grilled Paneer", "Cold Coffee"

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    diet_type diet_type NOT NULL DEFAULT 'VEG',

    -- Base price (for items without variants)
    base_price DECIMAL(10, 2),

    -- Whether this item has variants (size/portion variants)
    has_variants BOOLEAN DEFAULT false,
    variant_type variant_type,

    -- Nutritional info (optional)
    calories INTEGER,
    protein_grams DECIMAL(6, 2),
    carbs_grams DECIMAL(6, 2),
    fat_grams DECIMAL(6, 2),
    fiber_grams DECIMAL(6, 2),

    -- Display settings
    display_order INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Unique slug per category
    UNIQUE(category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_diet_type ON menu_items(diet_type);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);

-- =============================================
-- ITEM VARIANTS TABLE
-- =============================================
-- Stores variants for items (4oz/6oz/8oz or Half/Full or Brown Rice/Quinoa)

CREATE TABLE IF NOT EXISTS item_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,

    -- Variant details
    name VARCHAR(50) NOT NULL,           -- "4oz", "Half", "Brown Rice"
    label VARCHAR(100),                   -- Display label "4 Ounces", "Half Portion"
    price DECIMAL(10, 2) NOT NULL,

    -- Nutritional info for this variant (optional)
    calories INTEGER,
    protein_grams DECIMAL(6, 2),

    -- Display order (1st, 2nd, 3rd option)
    display_order INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(menu_item_id, name)
);

CREATE INDEX IF NOT EXISTS idx_item_variants_menu_item ON item_variants(menu_item_id);

-- =============================================
-- ADD-ONS TABLE
-- =============================================
-- Stores add-ons like "Mixed Beans", "Quinoa", "Egg", "Dressings"

CREATE TABLE IF NOT EXISTS addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,

    -- Unit info (per 100g, per piece, etc.)
    unit VARCHAR(50) DEFAULT 'piece',    -- "100g", "piece", "serving"
    unit_quantity DECIMAL(6, 2),          -- 100 (for 100g)

    -- Nutritional info
    calories INTEGER,
    protein_grams DECIMAL(6, 2),

    -- Grouping (for UI display)
    addon_group VARCHAR(50),              -- "proteins", "carbs", "dressings", "extras"

    display_order INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_addons_slug ON addons(slug);
CREATE INDEX IF NOT EXISTS idx_addons_group ON addons(addon_group);

-- =============================================
-- CATEGORY ADD-ONS (Many-to-Many)
-- =============================================
-- Links which add-ons are available for which categories

CREATE TABLE IF NOT EXISTS category_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    addon_id UUID NOT NULL REFERENCES addons(id) ON DELETE CASCADE,

    -- Optional price override for this category
    price_override DECIMAL(10, 2),

    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(category_id, addon_id)
);

CREATE INDEX IF NOT EXISTS idx_category_addons_category ON category_addons(category_id);
CREATE INDEX IF NOT EXISTS idx_category_addons_addon ON category_addons(addon_id);

-- =============================================
-- ITEM ADD-ONS (Many-to-Many) - Optional Overrides
-- =============================================
-- For item-specific add-on rules (e.g., some items can't have certain add-ons)

CREATE TABLE IF NOT EXISTS item_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    addon_id UUID NOT NULL REFERENCES addons(id) ON DELETE CASCADE,

    -- Price override for this specific item
    price_override DECIMAL(10, 2),

    -- Whether this addon is allowed for this item (false = excluded)
    is_allowed BOOLEAN DEFAULT true,

    -- Max quantity allowed (null = unlimited)
    max_quantity INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(menu_item_id, addon_id)
);

CREATE INDEX IF NOT EXISTS idx_item_addons_item ON item_addons(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_item_addons_addon ON item_addons(addon_id);

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_item_variants_updated_at ON item_variants;
CREATE TRIGGER update_item_variants_updated_at
    BEFORE UPDATE ON item_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_addons_updated_at ON addons;
CREATE TRIGGER update_addons_updated_at
    BEFORE UPDATE ON addons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

module.exports = { createMenuSchema };
