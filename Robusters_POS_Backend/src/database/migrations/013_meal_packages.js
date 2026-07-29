/**
 * Migration: Meal Package Management System
 * Creates tables for subscription-based meal packages
 */

const createMealPackagesSchema = `
-- ============================================
-- 1. MEAL PACKAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS meal_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  meal_count INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  validity_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT meal_count_positive CHECK (meal_count > 0),
  CONSTRAINT price_positive CHECK (price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_meal_packages_active ON meal_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_meal_packages_meal_count ON meal_packages(meal_count);

-- ============================================
-- 2. PACKAGE ALLOWED ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS package_allowed_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES meal_packages(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES item_variants(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT must_have_item_or_category CHECK (
    (menu_item_id IS NOT NULL) OR (category_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_package_items_package ON package_allowed_items(package_id);
CREATE INDEX IF NOT EXISTS idx_package_items_item ON package_allowed_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_package_items_category ON package_allowed_items(category_id);

-- ============================================
-- 3. CUSTOMER MEAL PACKAGES TABLE
-- ============================================
-- NOTE: no location_id here (or on meal_packages) — packages are shared
-- across all locations by design today. If per-outlet catalogs are ever
-- needed, that's a schema change + product decision, not a bug fix.
CREATE TABLE IF NOT EXISTS customer_meal_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES meal_packages(id),

  total_meals INTEGER NOT NULL,
  consumed_meals INTEGER DEFAULT 0,
  remaining_meals INTEGER GENERATED ALWAYS AS (total_meals - consumed_meals) STORED,

  package_price DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'pending',

  -- NOTE: bare DATE, compared against the DB server's CURRENT_DATE in
  -- getExpiringPackages() — fine for a single-timezone deployment, but a
  -- real gap if locations ever span timezones (a package could read as
  -- expired/not-expired a day early or late depending on where the DB sits
  -- relative to midnight). Revisit if/when that happens; not changed here
  -- since it'd mean widening to TIMESTAMPTZ and touching every date
  -- comparison in this feature — too large a change to fold into a bug fix.
  starts_at DATE NOT NULL,
  expires_at DATE,
  status VARCHAR(20) DEFAULT 'active',

  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT consumed_not_exceed_total CHECK (consumed_meals <= total_meals),
  CONSTRAINT total_meals_positive CHECK (total_meals > 0),
  CONSTRAINT amount_paid_valid CHECK (amount_paid >= 0 AND amount_paid <= package_price)
);

CREATE INDEX IF NOT EXISTS idx_customer_packages_customer ON customer_meal_packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_packages_status ON customer_meal_packages(status);
CREATE INDEX IF NOT EXISTS idx_customer_packages_expiry ON customer_meal_packages(expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_packages_active ON customer_meal_packages(customer_id, status) WHERE status = 'active';

-- ============================================
-- 4. PACKAGE MEAL CONSUMPTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS package_meal_consumption (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_package_id UUID NOT NULL REFERENCES customer_meal_packages(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id),

  meals_consumed INTEGER DEFAULT 1,
  consumed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  order_total DECIMAL(10,2),
  order_items JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consumption_package ON package_meal_consumption(customer_package_id);
CREATE INDEX IF NOT EXISTS idx_consumption_order ON package_meal_consumption(order_id);
CREATE INDEX IF NOT EXISTS idx_consumption_date ON package_meal_consumption(consumed_at DESC);

-- ============================================
-- 5. PACKAGE ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS package_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,

  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  changes JSONB,
  metadata JSONB,

  customer_id UUID REFERENCES customers(id),
  package_id UUID REFERENCES meal_packages(id),

  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_entity ON package_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_date ON package_activity_log(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON package_activity_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_activity_customer ON package_activity_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON package_activity_log(action);

-- ============================================
-- 6. ALTER ORDERS TABLE
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_package_id UUID REFERENCES customer_meal_packages(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS meals_consumed INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_package_order BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_package ON orders(customer_package_id) WHERE customer_package_id IS NOT NULL;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp for meal_packages
DROP TRIGGER IF EXISTS update_meal_packages_updated_at ON meal_packages;
CREATE TRIGGER update_meal_packages_updated_at
  BEFORE UPDATE ON meal_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp for customer_meal_packages
DROP TRIGGER IF EXISTS update_customer_packages_updated_at ON customer_meal_packages;
CREATE TRIGGER update_customer_packages_updated_at
  BEFORE UPDATE ON customer_meal_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-complete package when all meals consumed
CREATE OR REPLACE FUNCTION check_package_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.consumed_meals >= NEW.total_meals AND (OLD.consumed_meals IS NULL OR OLD.consumed_meals < OLD.total_meals) THEN
    NEW.status = 'completed';
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_package_completion ON customer_meal_packages;
CREATE TRIGGER trigger_package_completion
  BEFORE UPDATE OF consumed_meals ON customer_meal_packages
  FOR EACH ROW
  EXECUTE FUNCTION check_package_completion();
`;

module.exports = { createMealPackagesSchema };
