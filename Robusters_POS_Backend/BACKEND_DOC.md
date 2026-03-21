# Robusters POS - Backend Documentation

## Tech Stack

- **Runtime:** Node.js + Express.js
- **Database:** PostgreSQL (connection pooling, max 10)
- **Auth:** JWT (24h expiry) + Bcrypt (12 salt rounds)
- **Security:** Helmet, CORS
- **Validation:** express-validator

---

## Folder Structure

```
src/
├── app.js                  # Express app setup (middleware, routes, error handling)
├── server.js               # Entry point - starts server, runs migrations
├── config/index.js         # Env vars (port, db, jwt, bcrypt config)
├── database/
│   ├── connection.js       # PostgreSQL pool (max 10, 30s timeout)
│   ├── init.js             # Runs migrations, creates admin user
│   ├── seed.js             # Demo data seeder
│   ├── seedMenu.js         # Menu data seeder
│   └── migrations/         # Schema migrations (002-012)
├── models/                 # Data access layer (raw SQL queries)
├── controllers/            # Business logic layer
├── routes/                 # API endpoint definitions
├── middleware/
│   ├── auth.js             # JWT auth + role-based access
│   └── errorHandler.js     # Global error handler + 404
├── utils/
│   ├── jwt.js              # Token generation/verification
│   ├── password.js         # Bcrypt hash/compare
│   ├── errors.js           # Custom error classes (400-422)
│   ├── priceCalculator.js  # Order total + 5% GST calculation
│   └── caseConverter.js    # snake_case <-> camelCase
└── validators/             # Input validation rules (auth, menu, orders, customers)
```

---

## Database Tables

### users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| email | VARCHAR(255) | Unique, required |
| password_hash | VARCHAR(255) | Bcrypt hashed |
| first_name | VARCHAR(100) | Required |
| last_name | VARCHAR(100) | Required |
| role | ENUM | `ADMIN` or `MANAGER` |
| is_active | BOOLEAN | Default: true |
| last_login | TIMESTAMP | Updated on login |
| created_at, updated_at | TIMESTAMP | Auto-managed |

### categories
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| name | VARCHAR(100) | Required |
| slug | VARCHAR(100) | Unique, auto-generated |
| description | TEXT | Optional |
| image_url | VARCHAR(500) | Optional |
| display_order | INTEGER | For sorting |
| is_active | BOOLEAN | Default: true |

### menu_items
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| category_id | UUID (FK) | References categories, CASCADE delete |
| name | VARCHAR(150) | Required |
| slug | VARCHAR(150) | Unique per category |
| description | TEXT | Optional |
| diet_type | ENUM | `VEG`, `NON_VEG`, `VEGAN`, `EGGETARIAN` |
| base_price | DECIMAL(10,2) | Price when no variants |
| has_variants | BOOLEAN | Whether item uses variants |
| variant_type | ENUM | `SIZE`, `PORTION`, `CARB_TYPE`, `CUSTOM` |
| calories, protein_grams, carbs_grams, fat_grams, fiber_grams | NUMERIC | Nutritional info |
| is_available | BOOLEAN | Togglable by managers |
| is_featured | BOOLEAN | Featured items |
| display_order | INTEGER | For sorting |

### item_variants
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| menu_item_id | UUID (FK) | References menu_items, CASCADE delete |
| name | VARCHAR(50) | e.g. "4oz", "Half", "Brown Rice" |
| label | VARCHAR(100) | Display label |
| price | DECIMAL(10,2) | Required |
| calories, protein_grams | NUMERIC | Nutritional info |
| display_order | INTEGER | For sorting |
| is_available | BOOLEAN | Default: true |

### addons
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| name | VARCHAR(100) | Required |
| slug | VARCHAR(100) | Unique |
| description | TEXT | Optional |
| price | DECIMAL(10,2) | Base price |
| unit | VARCHAR(50) | "100g", "piece", "serving" |
| addon_group | VARCHAR(50) | "proteins", "carbs", "extras", "dressings", "salads" |
| is_available | BOOLEAN | Default: true |

### category_addons (junction table)
Links addons to categories with optional price overrides.

| Column | Type | Notes |
|--------|------|-------|
| category_id | UUID (FK) | References categories |
| addon_id | UUID (FK) | References addons |
| price_override | DECIMAL(10,2) | Optional category-specific price |
| Unique constraint | | (category_id, addon_id) |

### item_addons (junction table)
Item-level addon rules (overrides, exclusions, quantity limits).

| Column | Type | Notes |
|--------|------|-------|
| menu_item_id | UUID (FK) | References menu_items |
| addon_id | UUID (FK) | References addons |
| price_override | DECIMAL(10,2) | Item-specific price |
| is_allowed | BOOLEAN | Can exclude addons for specific items |
| max_quantity | INTEGER | Limit per item |

### orders
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| order_number | VARCHAR(50) | Unique, format: `ORD-YYYYMMDD-XXXX` |
| customer_phone | VARCHAR(20) | Optional |
| customer_name | VARCHAR(100) | Optional |
| customer_id | UUID (FK) | References customers |
| location_id | UUID (FK) | References locations |
| subtotal | DECIMAL(10,2) | Before tax |
| tax | DECIMAL(10,2) | 5% GST |
| total | DECIMAL(10,2) | subtotal + tax |
| payment_method | ENUM | `CASH`, `CARD`, `UPI`, `LOYALTY` |
| payment_status | ENUM | `PENDING`, `PAID`, `FAILED` |
| status | VARCHAR(50) | `CONFIRMED` or `CANCELLED` |
| cancellation_requested_by | UUID (FK) | Manager who requested |
| cancellation_reason | TEXT | Why cancelled |
| cancelled_by | UUID (FK) | Admin who approved |
| notes | TEXT | Order notes |
| created_by | UUID (FK) | User who created order |

### order_items
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| order_id | UUID (FK) | References orders, CASCADE delete |
| menu_item_id | UUID (FK) | References menu_items |
| quantity | INTEGER | Default: 1 |
| unit_price | DECIMAL(10,2) | Price at time of order |
| total_price | DECIMAL(10,2) | unit_price * quantity |
| variant_ids | JSONB | Array of variant UUIDs |
| addon_selections | JSONB | Array: `[{addonId, quantity}]` |
| special_instructions | TEXT | Per-item notes |

### order_status_history
Tracks every status change for audit trail.

| Column | Type | Notes |
|--------|------|-------|
| order_id | UUID (FK) | References orders |
| previous_status | VARCHAR(50) | Before change |
| new_status | VARCHAR(50) | After change |
| changed_by | UUID (FK) | Who changed it |
| reason | TEXT | Why changed |

### customers
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| phone | VARCHAR(20) | Unique, required |
| email | VARCHAR(255) | Unique, optional |
| first_name | VARCHAR(100) | Required |
| last_name | VARCHAR(100) | Optional |
| date_of_birth | DATE | Optional |
| total_orders | INTEGER | Auto-incremented on order |
| total_spent | DECIMAL(12,2) | Running total |
| loyalty_points | INTEGER | Earned from orders |
| is_active | BOOLEAN | Soft delete |

### customer_preferences
| Column | Type | Notes |
|--------|------|-------|
| customer_id | UUID (FK) | References customers |
| dietary_restrictions | TEXT[] | Array of restrictions |
| allergies | TEXT[] | Array of allergies |
| favorite_items | UUID[] | Array of menu item IDs |
| preferred_payment_method | VARCHAR(50) | Preferred payment |
| notes | TEXT | General notes |

### customer_orders (junction table)
Links customers to their orders.

| Column | Type | Notes |
|--------|------|-------|
| customer_id | UUID (FK) | References customers |
| order_id | UUID (FK) | References orders |
| Unique constraint | | (customer_id, order_id) |

### locations
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| name | VARCHAR(100) | Required |
| address | TEXT | Optional |
| phone | VARCHAR(20) | Optional |
| is_active | BOOLEAN | Soft delete |

### activity_logs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK) | References users, SET NULL on delete |
| action | VARCHAR(50) | See action types below |
| details | JSONB | Flexible metadata |
| ip_address | VARCHAR(45) | Client IP |
| user_agent | TEXT | Browser/client info |
| created_at | TIMESTAMP | When it happened |

**Action types:** `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `USER_CREATED`, `USER_UPDATED`, `USER_DEACTIVATED`, `USER_ACTIVATED`, `ORDER_CREATED`, `ORDER_CANCELLED`, `ORDER_CANCELLATION_REQUESTED`, `ORDER_CANCELLATION_APPROVED`, `ORDER_CANCELLATION_REJECTED`

### settings
Key-value store for app configuration.

| Column | Type | Notes |
|--------|------|-------|
| key | VARCHAR(100) | Unique setting name |
| value | JSONB | Setting value |
| description | TEXT | What the setting does |

**Default settings:**
- `loyalty_points_ratio`: `{spend_amount: 10, points_earned: 1}` — earn 1 point per Rs.10 spent
- `tier_thresholds`: `{bronze: 0, silver: 2000, gold: 5000, platinum: 10000}` — loyalty tiers
- `vip_order_threshold`: `{min_orders: 10}` — VIP after 10 orders

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | /login | Public | Login, returns JWT |
| POST | /logout | Private | Log logout activity |
| POST | /register | Admin | Create new user |
| GET | /me | Private | Current user profile |
| GET | /users | Admin | List all users |
| PUT | /users/:id | Admin | Update user |
| PATCH | /users/:id/deactivate | Admin | Deactivate user |
| PATCH | /users/:id/activate | Admin | Activate user |

### Menu (`/api/menu`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /public | Public | Full menu with categories, items, variants |
| GET | /search?q= | Public | Search menu items |
| POST | /calculate-price | Public | Calculate item price with variants/addons |
| POST | /calculate-order | Public | Calculate full order total |
| GET | /categories | Public | List categories |
| POST | /categories | Admin | Create category |
| PUT | /categories/:id | Admin | Update category |
| DELETE | /categories/:id | Admin | Delete category |
| PUT | /categories/reorder | Admin | Reorder categories |
| GET | /categories/:id/items | Public | Items in category |
| GET | /categories/:id/addons | Public | Addons for category |
| POST | /categories/:id/addons | Admin | Link addon to category |
| DELETE | /categories/:id/addons/:addonId | Admin | Unlink addon |
| GET | /items | Public | List all items |
| POST | /items | Admin | Create item |
| PUT | /items/:id | Admin | Update item |
| DELETE | /items/:id | Admin | Delete item |
| PATCH | /items/:id/toggle-availability | Manager+ | Toggle availability |
| POST | /items/:itemId/variants | Admin | Add variant |
| PUT | /variants/:id | Admin | Update variant |
| DELETE | /variants/:id | Admin | Delete variant |
| GET | /addons | Public | List addons |
| POST | /addons | Admin | Create addon |
| PUT | /addons/:id | Admin | Update addon |
| DELETE | /addons/:id | Admin | Delete addon |

### Orders (`/api/orders`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | / | Manager+ | Create order |
| GET | / | Manager+ | List orders (paginated, filterable) |
| GET | /stats | Manager+ | Order statistics |
| GET | /cancellation-requests | Admin | Pending cancellation requests |
| GET | /:id | Manager+ | Get single order |
| GET | /:id/status-history | Manager+ | Order status changes |
| PATCH | /:id/payment | Manager+ | Update payment status |
| POST | /:id/cancel-request | Manager+ | Request cancellation |
| POST | /:id/cancel-approve | Admin | Approve/reject cancellation |

### Customers (`/api/customers`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | /find-or-create | Private | Find or create customer |
| GET | /search?q= | Private | Search customers |
| GET | / | Manager+ | List customers (paginated) |
| POST | / | Manager+ | Create customer |
| GET | /top | Manager+ | Top customers by spending |
| GET | /:id | Manager+ | Get customer profile |
| PATCH | /:id | Manager+ | Update customer |
| GET | /:id/orders | Manager+ | Customer order history |
| PATCH | /:id/preferences | Manager+ | Update preferences |
| DELETE | /:id | Admin | Deactivate customer |

### Dashboard (`/api/dashboard`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /stats | Private | Today's stats with yesterday comparison |
| GET | /weekly | Private | This week's analytics |
| GET | /top-customers | Private | Top customers by spending |
| GET | /top-customers-week | Private | Top 5 customers this week |

### Locations (`/api/locations`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | / | Admin | Create location |
| GET | / | Manager+ | List locations |
| GET | /:id | Manager+ | Get location |
| PATCH | /:id | Admin | Update location |
| DELETE | /:id | Admin | Deactivate location |

### Activity Logs (`/api/activity-logs`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | / | Admin | Get logs (filterable by action, user, date) |
| GET | /actions | Admin | Get available action types |

### Settings (`/api/settings`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /public | Manager+ | Public settings (loyalty, tiers, VIP) |
| GET | / | Admin | All settings |
| PUT | /:key | Admin | Update setting |

### Health (`/api/health`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | / | Public | Basic health check |
| GET | /detailed | Public | Health + DB connection status |

---

## Middleware

### auth.js
- **`authenticate`** — Extracts JWT from `Authorization: Bearer <token>` header, verifies it, attaches `req.user` with `{id, email, role}`
- **`authorize(...roles)`** — Factory that checks `req.user.role` against allowed roles
- **`adminOnly`** — Shorthand for `authorize('ADMIN')`
- **`managerOrAdmin`** — Shorthand for `authorize('ADMIN', 'MANAGER')`

### errorHandler.js
- **`notFound`** — Returns 404 for unmatched routes
- **`errorHandler`** — Catches all errors, returns consistent JSON: `{success: false, message, errors}`

---

## Key Business Logic

### Order Creation Flow
1. Validate items exist and are available
2. Calculate prices (base + variants + addons) per item
3. Calculate subtotal, apply 5% GST tax
4. Generate order number (`ORD-YYYYMMDD-XXXX`)
5. Insert order + order_items in a **transaction**
6. If customer exists: link order, update `total_orders`, `total_spent`, `loyalty_points`
7. Log `ORDER_CREATED` activity

### Order Cancellation Flow
1. **Manager** requests cancellation with reason -> status stays `CONFIRMED`, sets `cancellation_requested_by/at/reason`
2. **Admin** reviews and approves/rejects:
   - **Approved:** Status -> `CANCELLED`, customer stats reversed (total_orders--, total_spent--, loyalty refunded)
   - **Rejected:** Cancellation fields cleared, order stays `CONFIRMED`
3. Status history recorded at each step

### Loyalty Points
- Earn: 1 point per Rs.10 spent (configurable via settings)
- Spend: `LOYALTY` payment method deducts points
- Tiers: Bronze (0), Silver (2000), Gold (5000), Platinum (10000) based on total points
- VIP status: Customers with 10+ orders (configurable)

### Dashboard Stats
- **Today's stats:** Total orders, revenue, avg order value, unique customers — compared with yesterday for trend %
- **Weekly analytics:** This week's totals
- **Top customers:** By total spending, with order counts
