# Robusters POS Backend

A Node.js + Express backend for a restaurant Point of Sale (POS) system with PostgreSQL database and JWT-based authentication. Built specifically for **Robusters Fitness Café** with a dynamic menu system supporting variants, add-ons, and real-time price calculation.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Environment Configuration](#environment-configuration)
- [API Documentation](#api-documentation)
  - [Health Check](#health-check)
  - [Authentication](#authentication)
  - [Menu System](#menu-system)
- [Menu System Overview](#menu-system-overview)
- [Database Schema](#database-schema)
- [File Documentation](#file-documentation)
- [Authentication Flow](#authentication-flow)
- [Request Flow](#request-flow)
- [Security Features](#security-features)

---

## Quick Start

### Prerequisites

- Node.js (v18+)
- PostgreSQL (running on port 5432)

### Installation

```bash
# Install dependencies
npm install

# Create database and tables
npm run db:init

# Create initial admin user
npm run db:seed

# Seed the complete menu (categories, items, variants, addons)
npm run db:seed-menu

# Start development server
npm run dev
```

### Default Admin Credentials

| Field | Value |
|-------|-------|
| Email | admin@robusters.com |
| Password | Admin@123 |

> **Warning:** Change these credentials in production!

---

## Project Structure

```
src/
├── config/
│   └── index.js                # Environment configuration loader
├── controllers/
│   ├── authController.js       # Authentication business logic
│   └── menuController.js       # Menu CRUD & price calculation
├── database/
│   ├── connection.js           # PostgreSQL connection pool
│   ├── init.js                 # Database initialization script
│   ├── seed.js                 # Initial admin user seeder
│   ├── seedMenu.js             # Complete menu seeder
│   └── migrations/
│       └── 002_menu_schema.js  # Menu database schema
├── middleware/
│   ├── auth.js                 # JWT authentication & role authorization
│   └── errorHandler.js         # Global error handling
├── models/
│   ├── User.js                 # User database operations
│   ├── Category.js             # Menu category operations
│   ├── MenuItem.js             # Menu item operations
│   ├── ItemVariant.js          # Variant operations (sizes, portions)
│   └── Addon.js                # Add-on operations & mappings
├── routes/
│   ├── auth.js                 # Authentication routes
│   ├── health.js               # Health check routes
│   ├── menu.js                 # Menu API routes
│   └── index.js                # Route aggregator
├── utils/
│   ├── errors.js               # Custom error classes
│   ├── jwt.js                  # JWT token utilities
│   ├── password.js             # Password hashing utilities
│   └── priceCalculator.js      # Dynamic price calculation
├── validators/
│   ├── auth.js                 # Auth input validation
│   └── menu.js                 # Menu input validation
├── app.js                      # Express application setup
└── server.js                   # Server entry point
```

---

## Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=robusters_pos
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Bcrypt Configuration
BCRYPT_SALT_ROUNDS=12
```

### Environment Variables Explained

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode (development/production) | development |
| `PORT` | Server port | 3000 |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | robusters_pos |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | (empty) |
| `JWT_SECRET` | Secret key for signing tokens | (required in production) |
| `JWT_EXPIRES_IN` | Token expiration time | 24h |
| `BCRYPT_SALT_ROUNDS` | Password hashing strength | 12 |

---

## API Documentation

### Base URL

```
http://localhost:3000/api
```

### Endpoints

#### Health Check

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/health` | Public | Basic health check |
| GET | `/health/detailed` | Public | Detailed health with database status |

**Example Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-01-15T09:30:00.000Z",
  "environment": "development"
}
```

---

#### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/login` | Public | Login and get JWT token |
| POST | `/auth/register` | Admin | Create new user |
| GET | `/auth/me` | Authenticated | Get current user profile |
| GET | `/auth/users` | Admin | List all users |
| PATCH | `/auth/users/:id/deactivate` | Admin | Deactivate a user |
| PATCH | `/auth/users/:id/activate` | Admin | Activate a user |

---

### POST /auth/login

Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "admin@robusters.com",
  "password": "Admin@123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cd47d9c8-d645-4f9b-b3d1-b5a08332d0cd",
      "email": "admin@robusters.com",
      "firstName": "System",
      "lastName": "Admin",
      "role": "ADMIN"
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

---

### POST /auth/register

Create a new user (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "email": "manager@robusters.com",
  "password": "Manager@123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "MANAGER"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1d031345-42c4-46df-b716-70f8b8a7b5b9",
      "email": "manager@robusters.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "MANAGER"
    }
  },
  "message": "User created successfully"
}
```

---

### GET /auth/me

Get current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cd47d9c8-d645-4f9b-b3d1-b5a08332d0cd",
      "email": "admin@robusters.com",
      "firstName": "System",
      "lastName": "Admin",
      "role": "ADMIN",
      "lastLogin": "2026-01-15T09:32:45.755Z",
      "createdAt": "2026-01-15T09:30:17.777Z"
    }
  }
}
```

---

### GET /auth/users

List all users (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | Maximum results to return |
| offset | number | 0 | Number of results to skip |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "cd47d9c8-d645-4f9b-b3d1-b5a08332d0cd",
        "email": "admin@robusters.com",
        "firstName": "System",
        "lastName": "Admin",
        "role": "ADMIN",
        "isActive": true,
        "lastLogin": "2026-01-15T09:32:45.755Z",
        "createdAt": "2026-01-15T09:30:17.777Z"
      }
    ],
    "count": 1
  }
}
```

---

## Menu System

The menu system supports dynamic pricing with variants and add-ons. Perfect for fitness cafés with customizable meal options.

### Menu Endpoints Overview

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/menu/public` | Public | Get complete menu for display |
| GET | `/menu/search?q=` | Public | Search menu items |
| POST | `/menu/calculate-price` | Public | Calculate item price with options |
| POST | `/menu/calculate-order` | Public | Calculate order total |

#### Categories

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/menu/categories` | Public | Get all categories |
| GET | `/menu/categories/:id` | Public | Get single category |
| POST | `/menu/categories` | Admin | Create category |
| PUT | `/menu/categories/:id` | Admin | Update category |
| DELETE | `/menu/categories/:id` | Admin | Delete category |
| PUT | `/menu/categories/reorder` | Admin | Reorder categories |
| GET | `/menu/categories/:id/items` | Public | Get items in category |
| GET | `/menu/categories/:id/addons` | Public | Get available addons |
| POST | `/menu/categories/:id/addons` | Admin | Link addon to category |
| DELETE | `/menu/categories/:id/addons/:addonId` | Admin | Unlink addon |

#### Menu Items

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/menu/items` | Public | Get all items |
| GET | `/menu/items/:id` | Public | Get single item with variants |
| POST | `/menu/items` | Admin | Create item |
| PUT | `/menu/items/:id` | Admin | Update item |
| DELETE | `/menu/items/:id` | Admin | Delete item |
| PATCH | `/menu/items/:id/toggle-availability` | Manager+ | Toggle availability |
| POST | `/menu/items/:itemId/variants` | Admin | Add variant to item |

#### Variants

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| PUT | `/menu/variants/:id` | Admin | Update variant |
| DELETE | `/menu/variants/:id` | Admin | Delete variant |

#### Add-ons

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/menu/addons` | Public | Get all addons |
| GET | `/menu/addons/:id` | Public | Get single addon |
| POST | `/menu/addons` | Admin | Create addon |
| PUT | `/menu/addons/:id` | Admin | Update addon |
| DELETE | `/menu/addons/:id` | Admin | Delete addon |

---

### GET /menu/public

Get the complete menu organized by categories (for customer display).

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "High Protein Meals",
        "slug": "high-protein-meals",
        "description": "Protein-packed meals for fitness enthusiasts",
        "displayOrder": 1,
        "items": [
          {
            "id": "uuid",
            "name": "Grilled Chicken Meal",
            "description": "Tender grilled chicken breast with sides",
            "dietType": "NON_VEG",
            "hasVariants": true,
            "variantType": "SIZE",
            "basePrice": null,
            "calories": 450,
            "proteinGrams": 42,
            "variants": [
              { "id": "uuid", "name": "4oz", "price": "199.00" },
              { "id": "uuid", "name": "6oz", "price": "259.00" },
              { "id": "uuid", "name": "8oz", "price": "319.00" }
            ]
          }
        ],
        "availableAddons": [
          { "id": "uuid", "name": "Extra Chicken", "price": "80.00" }
        ]
      }
    ]
  }
}
```

---

### POST /menu/categories

Create a new menu category (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "High Protein Meals",
  "description": "Protein-packed meals for fitness enthusiasts",
  "imageUrl": "https://example.com/image.jpg",
  "displayOrder": 1
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "High Protein Meals",
      "slug": "high-protein-meals",
      "description": "Protein-packed meals for fitness enthusiasts",
      "displayOrder": 1,
      "isActive": true
    }
  },
  "message": "Category created successfully"
}
```

---

### POST /menu/items

Create a new menu item (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request (with variants):**
```json
{
  "categoryId": "uuid-of-category",
  "name": "Grilled Chicken Breast",
  "description": "Tender grilled chicken breast",
  "dietType": "NON_VEG",
  "hasVariants": true,
  "variantType": "SIZE",
  "calories": 450,
  "proteinGrams": 42,
  "carbsGrams": 5,
  "fatGrams": 12,
  "variants": [
    { "name": "4oz", "price": 199 },
    { "name": "6oz", "price": 259 },
    { "name": "8oz", "price": 319 }
  ]
}
```

**Request (without variants):**
```json
{
  "categoryId": "uuid-of-category",
  "name": "Green Smoothie",
  "description": "Fresh green vegetables blend",
  "dietType": "VEGAN",
  "hasVariants": false,
  "basePrice": 149,
  "calories": 120
}
```

**Diet Types:**
| Value | Description |
|-------|-------------|
| `VEGAN` | No animal products |
| `VEG` | Vegetarian (may contain dairy) |
| `EGGETARIAN` | Vegetarian + eggs |
| `NON_VEG` | Contains meat/fish |

**Variant Types:**
| Value | Description | Example |
|-------|-------------|---------|
| `SIZE` | Portion size variants | 4oz, 6oz, 8oz |
| `PORTION` | Serving portions | Half, Full |
| `CARB_TYPE` | Carb base options | Brown Rice, Quinoa |
| `CUSTOM` | Custom variants | Any other type |

---

### POST /menu/items/:itemId/variants

Add a new variant to an existing menu item (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "10oz",
  "label": "Extra Large",
  "price": 379,
  "calories": 600,
  "proteinGrams": 55,
  "displayOrder": 4
}
```

---

### POST /menu/addons

Create a new add-on (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Grilled Chicken Breast",
  "price": 80,
  "unit": "100g",
  "unitQuantity": 100,
  "addonGroup": "proteins",
  "calories": 165,
  "proteinGrams": 31
}
```

**Add-on Groups:**
| Group | Examples |
|-------|----------|
| `proteins` | Chicken, Egg, Paneer, Tofu |
| `carbs` | Brown Rice, Quinoa, Beans |
| `extras` | Cheese, Avocado, Nuts |
| `dressings` | Mayo, Vinaigrette, Hummus |
| `salads` | Garden Salad, Greek Salad |

---

### POST /menu/categories/:categoryId/addons

Link an add-on to a category (Admin only). This makes the add-on available for all items in the category.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "addonId": "uuid-of-addon",
  "priceOverride": 90
}
```

> **Note:** `priceOverride` is optional. Use it when an add-on should cost differently for a specific category.

---

### POST /menu/calculate-price

Calculate the total price for a single item with selected options.

**Request:**
```json
{
  "menuItemId": "uuid-of-menu-item",
  "variantId": "uuid-of-variant",
  "addons": [
    { "addonId": "uuid-of-addon-1", "quantity": 1 },
    { "addonId": "uuid-of-addon-2", "quantity": 2 }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "breakdown": {
      "menuItemId": "uuid",
      "menuItemName": "Grilled Chicken Breast",
      "variantId": "uuid",
      "variantName": "6oz",
      "basePrice": 259,
      "addons": [
        { "addonId": "uuid", "name": "Mixed Beans", "quantity": 1, "unitPrice": 40, "total": 40 },
        { "addonId": "uuid", "name": "Quinoa", "quantity": 2, "unitPrice": 50, "total": 100 }
      ],
      "addonsTotal": 140,
      "totalPrice": 399
    }
  }
}
```

---

### POST /menu/calculate-order

Calculate total for multiple items (order preview).

**Request:**
```json
{
  "items": [
    {
      "menuItemId": "uuid-1",
      "variantId": "uuid-variant",
      "quantity": 2,
      "addons": [
        { "addonId": "uuid-addon", "quantity": 1 }
      ]
    },
    {
      "menuItemId": "uuid-2",
      "quantity": 1
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "menuItemName": "Grilled Chicken Breast",
        "variantName": "6oz",
        "quantity": 2,
        "unitPrice": 299,
        "lineTotal": 598
      },
      {
        "menuItemName": "Green Smoothie",
        "variantName": null,
        "quantity": 1,
        "unitPrice": 149,
        "lineTotal": 149
      }
    ],
    "orderTotal": 747
  }
}
```

---

### GET /menu/search?q=chicken

Search menu items by name or description.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query (min 2 characters) |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Grilled Chicken Breast",
        "description": "Tender grilled chicken",
        "categoryName": "High Protein Meals",
        "dietType": "NON_VEG",
        "basePrice": null,
        "hasVariants": true,
        "minPrice": "199.00",
        "maxPrice": "319.00"
      }
    ],
    "count": 1
  }
}
```

---

## Menu System Overview

The menu system is designed for fitness cafés with flexible pricing:

### Concept Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        MENU STRUCTURE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐                                              │
│   │   Category   │  e.g., "High Protein Meals"                  │
│   └──────┬───────┘                                              │
│          │                                                       │
│          │ has many                                              │
│          ▼                                                       │
│   ┌──────────────┐                                              │
│   │  Menu Item   │  e.g., "Grilled Chicken Breast"              │
│   └──────┬───────┘                                              │
│          │                                                       │
│          │ may have                                              │
│          ▼                                                       │
│   ┌──────────────┐                                              │
│   │   Variants   │  e.g., "4oz" = ₹199, "6oz" = ₹259            │
│   └──────────────┘                                              │
│                                                                  │
│   ┌──────────────┐                                              │
│   │   Add-ons    │  e.g., "Extra Chicken" = ₹80                 │
│   └──────┬───────┘                                              │
│          │                                                       │
│          │ linked to                                             │
│          ▼                                                       │
│   ┌──────────────┐                                              │
│   │  Categories  │  Add-ons available for all items in category │
│   └──────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Variant Types Explained

| Type | Use Case | Example Items |
|------|----------|---------------|
| **SIZE** | Different portion weights | Chicken Breast (4oz/6oz/8oz) |
| **PORTION** | Half vs Full serving | Quinoa Bowl (Half/Full) |
| **CARB_TYPE** | Different carb bases | Meal with (Brown Rice/Quinoa) |
| **CUSTOM** | Any other variation | Custom combos |

### Price Calculation Logic

```
Total Price = Base Price (or Variant Price) + Σ(Addon Price × Quantity)
```

**Example:**
```
Grilled Chicken (6oz)     = ₹259
+ Mixed Beans × 1         = ₹40
+ Quinoa × 2              = ₹100
─────────────────────────────────
Total                     = ₹399
```

### Add-on Mapping System

Add-ons can be linked at two levels:

1. **Category Level**: Add-on available for all items in the category
2. **Item Level**: Override price or exclude add-on for specific items

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADDON MAPPING                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Addon: "Grilled Chicken" (Base Price: ₹80)                    │
│                    │                                             │
│        ┌──────────┴──────────┐                                  │
│        │                     │                                   │
│        ▼                     ▼                                   │
│   ┌─────────────┐      ┌─────────────┐                          │
│   │ Category A  │      │ Category B  │                          │
│   │ Price: ₹80  │      │ Price: ₹90  │  (override)              │
│   └─────────────┘      └─────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Menu Tables

```sql
-- Categories (menu sections)
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Menu Items
CREATE TABLE menu_items (
    id UUID PRIMARY KEY,
    category_id UUID REFERENCES categories(id),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    description TEXT,
    diet_type diet_type DEFAULT 'VEG',  -- VEGAN, VEG, EGGETARIAN, NON_VEG
    base_price DECIMAL(10,2),           -- NULL if has variants
    has_variants BOOLEAN DEFAULT false,
    variant_type variant_type,          -- SIZE, PORTION, CARB_TYPE, CUSTOM
    calories INTEGER,
    protein_grams DECIMAL(6,2),
    carbs_grams DECIMAL(6,2),
    fat_grams DECIMAL(6,2),
    fiber_grams DECIMAL(6,2),
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Item Variants (different sizes/portions)
CREATE TABLE item_variants (
    id UUID PRIMARY KEY,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,          -- "4oz", "Half", "Quinoa"
    label VARCHAR(100),                 -- Display label
    price DECIMAL(10,2) NOT NULL,
    calories INTEGER,
    protein_grams DECIMAL(6,2),
    display_order INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add-ons (extras that can be added)
CREATE TABLE addons (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50),                   -- "100g", "piece", etc.
    unit_quantity DECIMAL(8,2),
    addon_group VARCHAR(50),            -- proteins, carbs, extras, etc.
    calories INTEGER,
    protein_grams DECIMAL(6,2),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Category-Addon mapping (which addons available for which categories)
CREATE TABLE category_addons (
    id UUID PRIMARY KEY,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    addon_id UUID REFERENCES addons(id) ON DELETE CASCADE,
    price_override DECIMAL(10,2),       -- Optional category-specific price
    display_order INTEGER DEFAULT 0,
    UNIQUE(category_id, addon_id)
);

-- Item-Addon mapping (for item-specific overrides)
CREATE TABLE item_addons (
    id UUID PRIMARY KEY,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    addon_id UUID REFERENCES addons(id) ON DELETE CASCADE,
    price_override DECIMAL(10,2),
    is_excluded BOOLEAN DEFAULT false,  -- Exclude addon for this item
    UNIQUE(menu_item_id, addon_id)
);
```

### Enum Types

```sql
-- Variant types
CREATE TYPE variant_type AS ENUM ('SIZE', 'PORTION', 'CARB_TYPE', 'CUSTOM');

-- Diet types
CREATE TYPE diet_type AS ENUM ('VEGAN', 'VEG', 'EGGETARIAN', 'NON_VEG');
```

---

## File Documentation

### Configuration Files

#### `.env`
Stores sensitive environment variables like database credentials and JWT secrets. Never commit this file to version control.

#### `src/config/index.js`
Loads and validates environment variables. Provides default values and throws errors for missing required values in production.

---

### Database Files

#### `src/database/connection.js`
Creates a PostgreSQL connection pool for efficient database access.

**Key Features:**
- Connection pooling (max 20 connections)
- Automatic idle connection cleanup (30 seconds)
- Connection timeout (5 seconds)
- Query logging in development mode

**Exported Functions:**
| Function | Description |
|----------|-------------|
| `query(sql, params)` | Execute a parameterized SQL query |
| `getClient()` | Get a dedicated client for transactions |
| `testConnection()` | Test if database is reachable |
| `closePool()` | Close all connections gracefully |

#### `src/database/init.js`
Run with `npm run db:init`. Creates the database and all required tables.

**Creates:**
- `robusters_pos` database
- `users` table with UUID primary key
- `user_role` enum type (ADMIN, MANAGER)
- Indexes on email and role columns
- Auto-update trigger for `updated_at` column

#### `src/database/seed.js`
Run with `npm run db:seed`. Creates the initial admin user.

---

### Utility Files

#### `src/utils/password.js`
Handles password hashing using bcrypt.

| Function | Description |
|----------|-------------|
| `hashPassword(password)` | Hash a plain text password |
| `comparePassword(password, hash)` | Verify password against hash |

#### `src/utils/jwt.js`
Handles JWT token creation and verification.

| Function | Description |
|----------|-------------|
| `generateToken(user)` | Create JWT with user id, email, and role |
| `verifyToken(token)` | Verify and decode a JWT token |
| `extractToken(header)` | Extract token from "Bearer xxx" format |

**Token Payload:**
```javascript
{
  sub: "user-uuid",           // User ID
  email: "user@example.com",  // User email
  role: "ADMIN",              // User role
  iat: 1234567890,            // Issued at
  exp: 1234654290,            // Expires at
  iss: "robusters-pos"        // Issuer
}
```

#### `src/utils/errors.js`
Custom error classes for consistent error handling.

| Error Class | HTTP Code | Use Case |
|-------------|-----------|----------|
| `BadRequestError` | 400 | Invalid request format |
| `UnauthorizedError` | 401 | Missing or invalid authentication |
| `ForbiddenError` | 403 | Authenticated but not authorized |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Duplicate resource (e.g., email exists) |
| `ValidationError` | 422 | Input validation failed |

---

### Model Files

#### `src/models/User.js`
Database operations for the users table.

| Function | Description |
|----------|-------------|
| `findByEmail(email)` | Find user by email (includes password hash) |
| `findById(id)` | Find user by UUID (excludes password hash) |
| `create(userData)` | Create new user (auto-hashes password) |
| `updateLastLogin(id)` | Update last login timestamp |
| `findAll(options)` | Get all users with pagination |
| `updateActiveStatus(id, isActive)` | Activate/deactivate user |
| `hasAnyUser()` | Check if any users exist |

---

### Middleware Files

#### `src/middleware/auth.js`
Authentication and authorization middleware.

| Middleware | Description |
|------------|-------------|
| `authenticate` | Verifies JWT token and attaches user to request |
| `authorize(...roles)` | Factory function for role-based access |
| `adminOnly` | Shorthand for `authorize('ADMIN')` |
| `managerOrAdmin` | Shorthand for `authorize('ADMIN', 'MANAGER')` |

**Usage:**
```javascript
// Require authentication
router.get('/me', authenticate, controller.getProfile);

// Require admin role
router.post('/register', authenticate, adminOnly, controller.register);

// Allow multiple roles
router.get('/reports', authenticate, authorize('ADMIN', 'MANAGER'), controller.reports);
```

#### `src/middleware/errorHandler.js`
Global error handling middleware.

| Middleware | Description |
|------------|-------------|
| `notFound` | Handles 404 for undefined routes |
| `errorHandler` | Catches all errors and formats response |

---

### Validator Files

#### `src/validators/auth.js`
Input validation using express-validator.

| Validator | Rules |
|-----------|-------|
| `loginRules` | Valid email format, password required |
| `registerRules` | Valid email, strong password, names 2-100 chars, valid role |

**Usage:**
```javascript
router.post('/login', loginRules, validate, controller.login);
```

---

### Controller Files

#### `src/controllers/authController.js`
Business logic for authentication.

| Function | Description |
|----------|-------------|
| `login` | Authenticate and return JWT token |
| `register` | Create new user (admin only) |
| `getProfile` | Get current user's profile |
| `getAllUsers` | List all users (admin only) |
| `deactivateUser` | Deactivate a user account |
| `activateUser` | Activate a user account |

---

### Route Files

#### `src/routes/auth.js`
Authentication API routes.

#### `src/routes/health.js`
Health check API routes.

#### `src/routes/index.js`
Aggregates all route modules under `/api` prefix.

---

### Application Files

#### `src/app.js`
Express application configuration.

**Middleware Stack (in order):**
1. `helmet` - Security headers
2. `cors` - Cross-origin resource sharing
3. `morgan` - Request logging
4. `express.json` - JSON body parsing
5. Routes
6. `notFound` - 404 handler
7. `errorHandler` - Global error handler

#### `src/server.js`
Server entry point.

**Features:**
- Starts HTTP server
- Tests database connection on startup
- Graceful shutdown handling (SIGTERM, SIGINT)
- Uncaught exception handling

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Client sends POST /api/auth/login                           │
│     { email: "admin@robusters.com", password: "Admin@123" }     │
│                                                                  │
│  2. Server validates input (validators/auth.js)                 │
│                                                                  │
│  3. Controller finds user by email (models/User.js)             │
│                                                                  │
│  4. Controller compares password with hash (utils/password.js)  │
│                                                                  │
│  5. Controller generates JWT token (utils/jwt.js)               │
│                                                                  │
│  6. Server returns token to client                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATED REQUEST FLOW                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Client sends request with header:                           │
│     Authorization: Bearer <token>                                │
│                                                                  │
│  2. authenticate middleware extracts token                       │
│                                                                  │
│  3. authenticate middleware verifies token (utils/jwt.js)       │
│                                                                  │
│  4. authenticate middleware fetches user from database          │
│                                                                  │
│  5. authenticate middleware attaches user to req.user           │
│                                                                  │
│  6. authorize middleware checks if user.role is allowed         │
│                                                                  │
│  7. Controller handles the request                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Request Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    COMPLETE REQUEST LIFECYCLE                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Client Request                                                  │
│         │                                                         │
│         ▼                                                         │
│   ┌─────────────┐                                                │
│   │  server.js  │  Entry point                                   │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐                                                │
│   │   app.js    │  Express configuration                         │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐                                                │
│   │   helmet    │  Add security headers                          │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐                                                │
│   │    cors     │  Handle CORS                                   │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐                                                │
│   │   morgan    │  Log request                                   │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐                                                │
│   │ body parser │  Parse JSON body                               │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐                                                │
│   │   routes    │  Match URL to handler                          │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐                                                │
│   │ validators  │  Validate input                                │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐                                                │
│   │authenticate │  Verify JWT (if protected)                     │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐                                                │
│   │ authorize   │  Check role (if restricted)                    │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐                                                │
│   │ controller  │  Business logic                                │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐                                                │
│   │   model     │  Database operations                           │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐                                                │
│   │ connection  │  Execute SQL query                             │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│      Response                                                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Security Features

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| Password Hashing | bcrypt (12 rounds) | Passwords never stored in plain text |
| JWT Authentication | jsonwebtoken | Stateless authentication |
| Role-Based Access | Custom middleware | Restrict endpoints by user role |
| Input Validation | express-validator | Prevent malformed data |
| SQL Injection Prevention | Parameterized queries | Prevent database attacks |
| Security Headers | helmet | Prevent common web vulnerabilities |
| CORS | cors middleware | Control cross-origin access |
| Rate Limiting | (recommended to add) | Prevent brute force attacks |
| Request Size Limit | express.json({ limit }) | Prevent large payload attacks |

---

## NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `node src/server.js` | Start production server |
| `npm run dev` | `nodemon src/server.js` | Start with hot reload |
| `npm run db:init` | `node src/database/init.js` | Initialize database |
| `npm run db:seed` | `node src/database/seed.js` | Seed initial data |

---

## User Roles

| Role | Permissions |
|------|-------------|
| ADMIN | Full access to all endpoints |
| MANAGER | Access to authenticated endpoints only |

---

## Error Response Format

All errors follow this consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": []
  }
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| BAD_REQUEST | 400 | Invalid request |
| UNAUTHORIZED | 401 | Authentication failed |
| FORBIDDEN | 403 | Not authorized for this action |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| VALIDATION_ERROR | 422 | Input validation failed |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

## License

ISC
