# Meal Package Management System - Complete Implementation Guide

## 📋 Overview

A comprehensive **subscription-based meal package system** with OTP verification for the Robusters POS. This system allows:
- Admin to create and manage meal packages (30/60/90 meals)
- Assign packages to customers (including onboarding existing offline users)
- Secure OTP-verified meal consumption tracking
- Complete dashboard for monitoring package usage

---

## 🏗️ Architecture

### Backend (Node.js + PostgreSQL)
- RESTful API with Express.js
- PostgreSQL database with 5 new tables
- OTP service with in-memory storage
- Complete audit logging
- Input validation with express-validator

### Frontend (Next.js 15 + TypeScript)
- React 18 with TypeScript
- Tailwind CSS + Radix UI components
- Zustand for state management
- React Hook Form for forms
- Input-OTP for OTP input

---

## 📦 Backend Implementation

### 1. Database Schema

#### Table: `meal_packages`
Stores package templates created by admin

```sql
- id (UUID, PK)
- name (VARCHAR) - "30 Meals Package"
- description (TEXT)
- meal_count (INTEGER) - 30, 60, 90
- price (DECIMAL) - Package price
- validity_days (INTEGER) - Optional validity period
- is_active (BOOLEAN)
- created_by (UUID) - Admin user ID
- created_at, updated_at (TIMESTAMP)
```

#### Table: `package_allowed_items`
Defines which menu items/categories are allowed in each package

```sql
- id (UUID, PK)
- package_id (UUID, FK → meal_packages)
- menu_item_id (UUID, FK → menu_items) - Optional
- variant_id (UUID, FK → item_variants) - Optional
- category_id (UUID, FK → categories) - Optional
- created_at (TIMESTAMP)

CONSTRAINT: Must have either menu_item_id OR category_id
```

#### Table: `customer_meal_packages`
Active package subscriptions for customers

```sql
- id (UUID, PK)
- customer_id (UUID, FK → customers)
- package_id (UUID, FK → meal_packages)
- total_meals (INTEGER) - Total meals in package
- consumed_meals (INTEGER) - Meals already consumed
- remaining_meals (GENERATED) - Auto-calculated
- package_price (DECIMAL)
- amount_paid (DECIMAL)
- payment_status (ENUM: pending, partial, paid)
- starts_at (DATE)
- expires_at (DATE) - Optional
- status (ENUM: active, completed, expired, cancelled)
- assigned_by (UUID) - Admin who assigned
- assigned_at, completed_at, cancelled_at (TIMESTAMP)
- cancellation_reason (TEXT)
- notes (TEXT) - For migration notes
- created_at, updated_at (TIMESTAMP)
```

**Key Feature:** `consumed_meals` can be set during assignment for migrating offline users!

#### Table: `package_meal_consumption`
History of every meal consumed

```sql
- id (UUID, PK)
- customer_package_id (UUID, FK → customer_meal_packages)
- order_id (UUID, FK → orders)
- meals_consumed (INTEGER, default: 1)
- consumed_at (TIMESTAMP)
- order_total (DECIMAL)
- order_items (JSONB) - Full order details
- created_at (TIMESTAMP)
```

#### Table: `package_activity_log`
Complete audit trail

```sql
- id (UUID, PK)
- entity_type (VARCHAR) - package, assignment, consumption
- entity_id (UUID) - ID of the entity
- action (VARCHAR) - package_created, meal_consumed, etc.
- performed_by (UUID, FK → users)
- performed_at (TIMESTAMP)
- changes (JSONB) - Before/after state
- metadata (JSONB) - Additional context
- customer_id (UUID) - Related customer
- package_id (UUID) - Related package
- ip_address (INET)
- user_agent (TEXT)
```

#### Modified: `orders` table
Extended to support package orders

```sql
+ customer_package_id (UUID, FK → customer_meal_packages)
+ meals_consumed (INTEGER)
+ is_package_order (BOOLEAN)
```

---

### 2. API Endpoints

#### **Meal Package CRUD (Admin Only)**

```
POST   /api/admin/meal-packages                    Create package
GET    /api/admin/meal-packages                    List all packages
GET    /api/admin/meal-packages/:id                Get package details
PUT    /api/admin/meal-packages/:id                Update package
PATCH  /api/admin/meal-packages/:id/toggle         Activate/deactivate
DELETE /api/admin/meal-packages/:id                Soft delete
GET    /api/admin/meal-packages/:id/statistics     Package stats
```

**Example: Create Package**
```json
POST /api/admin/meal-packages
{
  "name": "30 Meals Package",
  "description": "Basic meal package",
  "mealCount": 30,
  "price": 2999.99,
  "validityDays": 30
}
```

#### **Allowed Items Management (Admin Only)**

```
GET    /api/admin/meal-packages/:id/allowed-items           Get allowed items
POST   /api/admin/meal-packages/:id/allowed-items           Add item/category
POST   /api/admin/meal-packages/:id/allowed-items/bulk      Bulk add
DELETE /api/admin/meal-packages/:id/allowed-items/:itemId   Remove item
DELETE /api/admin/meal-packages/:id/allowed-items           Clear all
```

**Example: Add Allowed Category**
```json
POST /api/admin/meal-packages/:packageId/allowed-items
{
  "categoryId": "category-uuid"
}
```

#### **Package Assignment (Manager/Admin)**

```
POST   /api/admin/customer-packages                  Assign to customer
POST   /api/admin/customer-packages/bulk             Bulk assign (migration)
GET    /api/admin/customer-packages/:id              Get assignment details
PUT    /api/admin/customer-packages/:id              Update assignment
POST   /api/admin/customer-packages/:id/cancel       Cancel package
GET    /api/admin/customers/:customerId/packages     Customer's packages
```

**Example: Assign Package (New Customer)**
```json
POST /api/admin/customer-packages
{
  "customerId": "customer-uuid",
  "packageId": "package-uuid",
  "totalMeals": 30,
  "consumedMeals": 0,
  "packagePrice": 2999.99,
  "amountPaid": 2999.99,
  "paymentStatus": "paid",
  "startsAt": "2026-01-31",
  "expiresAt": "2026-02-28"
}
```

**Example: Assign Package (Offline User Migration) ⭐**
```json
POST /api/admin/customer-packages
{
  "customerId": "customer-uuid",
  "packageId": "package-uuid",
  "totalMeals": 60,
  "consumedMeals": 15,  ← Already consumed 15 meals offline
  "packagePrice": 5499.99,
  "amountPaid": 5499.99,
  "paymentStatus": "paid",
  "startsAt": "2026-01-01",
  "expiresAt": "2026-03-01",
  "notes": "Migrated from offline system. 15 meals already consumed."
}

Response:
{
  "total_meals": 60,
  "consumed_meals": 15,
  "remaining_meals": 45  ← Auto-calculated!
}
```

#### **OTP Order Flow (Manager/Admin)**

```
POST   /api/meal-package-orders/lookup                          Lookup customer by phone
GET    /api/meal-package-orders/allowed-items/:packageId        Get allowed menu items
POST   /api/meal-package-orders/request-otp                     Request OTP
POST   /api/meal-package-orders/verify-and-create               Verify OTP & create order
```

**Complete OTP Flow:**

**Step 1: Lookup Customer**
```json
POST /api/meal-package-orders/lookup
{
  "phone": "9876543210"
}

Response:
{
  "customerFound": true,
  "hasActivePackage": true,
  "customer": {
    "id": "customer-uuid",
    "name": "John Doe",
    "phone": "9876543210"
  },
  "packages": [
    {
      "id": "assignment-uuid",
      "packageName": "60 Meals Package",
      "remainingMeals": 45
    }
  ]
}
```

**Step 2: Get Allowed Items**
```json
GET /api/meal-package-orders/allowed-items/:customerPackageId

Response:
{
  "customerPackage": {
    "id": "assignment-uuid",
    "packageName": "60 Meals Package",
    "remainingMeals": 45
  },
  "allowedItems": {
    "categories": [
      {"id": "cat-1", "name": "Veg Meals"}
    ],
    "menuItems": [],
    "variants": []
  }
}
```

**Step 3: Request OTP**
```json
POST /api/meal-package-orders/request-otp
{
  "customerPackageId": "assignment-uuid",
  "orderItems": [
    {
      "menuItemId": "item-uuid",
      "name": "Veg Biryani",
      "quantity": 1,
      "price": 250
    }
  ]
}

Response:
{
  "success": true,
  "message": "OTP sent to 9876543210",
  "phone": "9876543210",
  "expiryMinutes": 5
}

Console Output (Dev):
========================================
📱 SMS OTP (MOCK)
========================================
To: 9876543210
Message: Your Robusters POS OTP is: 123456
Purpose: meal_package_order
Valid for: 5 minutes
========================================
```

**Step 4: Verify OTP & Create Order**
```json
POST /api/meal-package-orders/verify-and-create
{
  "customerPackageId": "assignment-uuid",
  "otp": "123456",
  "orderItems": [
    {
      "menuItemId": "item-uuid",
      "name": "Veg Biryani",
      "quantity": 1,
      "price": 250
    }
  ],
  "mealsToConsume": 1
}

✅ Success Response:
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "id": "order-uuid",
    "orderNumber": "ORD-12345",
    "mealsConsumed": 1,
    "remainingMeals": 44
  }
}

❌ Invalid OTP Response:
{
  "success": false,
  "message": "Invalid OTP. 2 attempts remaining.",
  "code": "INVALID_OTP",
  "attemptsRemaining": 2
}
```

#### **Dashboard & Reports (Manager/Admin)**

```
GET    /api/meal-package-orders/dashboard                      Meal package dashboard
GET    /api/meal-package-orders/consumption-history/:id        Consumption history
GET    /api/admin/customer-packages/active                     All active packages
GET    /api/admin/customer-packages/expiring                   Expiring soon
```

**Example: Dashboard**
```json
GET /api/meal-package-orders/dashboard?status=active&search=9876543210

Response:
{
  "packages": [
    {
      "id": "assignment-uuid",
      "customer": {
        "name": "John Doe",
        "phone": "9876543210"
      },
      "package": {
        "name": "60 Meals Package",
        "totalMeals": 60,
        "consumedMeals": 16,
        "remainingMeals": 44
      },
      "status": "active",
      "paymentStatus": "paid",
      "startsAt": "2026-01-01",
      "expiresAt": "2026-03-01",
      "lastMealDate": "2026-01-31T13:30:00.000Z",
      "lastMealVerified": true
    }
  ]
}
```

---

### 3. OTP Service Features

Located in: `/src/utils/otpService.js`

**Features:**
- ✅ 6-digit OTP generation
- ✅ 5-minute expiry
- ✅ 3 verification attempts
- ✅ 60-second resend cooldown
- ✅ In-memory storage (use Redis in production)
- ✅ Auto-cleanup of expired OTPs
- ✅ Purpose-based OTP (prevents reuse across flows)

**Security:**
```javascript
// OTP is tied to:
- Phone number
- Purpose (meal_package_order)
- Expiry time
- Max attempts
- Verification status (prevents reuse)
```

---

### 4. Activity Logging

Located in: `/src/utils/packageActivityLogger.js`

**All actions are logged:**
- Package created/updated/deleted
- Items added/removed from packages
- Package assigned to customer
- Package cancelled
- Meals consumed (with OTP verification status)

**Example Log Entry:**
```json
{
  "entity_type": "consumption",
  "entity_id": "consumption-uuid",
  "action": "meal_consumed_otp_verified",
  "performed_by": "admin-uuid",
  "performed_at": "2026-01-31T13:30:00.000Z",
  "customer_id": "customer-uuid",
  "package_id": "package-uuid",
  "changes": {
    "before": {"consumed_meals": 15},
    "after": {"consumed_meals": 16}
  },
  "metadata": {
    "orderId": "order-uuid",
    "mealsConsumed": 1,
    "otpVerified": true,
    "remainingMeals": 44
  }
}
```

---

## 🎨 Frontend Implementation

### Service Layer

**File:** `/src/services/mealPackageService.ts`

**Complete API client with:**
- TypeScript interfaces for all entities
- All CRUD operations
- OTP flow methods
- Dashboard queries
- Error handling via axios interceptors

---

### Pages to Create

#### 1. **Meal Packages Management** (`/meal-packages`)
- List all packages (30, 60, 90 meals)
- Create new package
- Edit/delete existing packages
- Toggle active status
- View package statistics

#### 2. **Assign Package** (`/meal-packages/assign`)
- Select customer (search by phone/name)
- Choose package
- Set consumed meals (for offline migration)
- Configure payment details
- Add notes

#### 3. **OTP Order Flow** (`/meal-package-orders`)
**Step-by-step wizard:**
- Step 1: Enter customer phone → Lookup
- Step 2: Select active package
- Step 3: Choose menu items (filtered by allowed items)
- Step 4: Request OTP → Customer receives SMS
- Step 5: Enter OTP → Verify
- Step 6: Order confirmed → Meal count reduced

#### 4. **Package Dashboard** (`/meal-packages/dashboard`)
- View all active packages
- Search by phone number
- Filter by status (active/completed/expired)
- View consumption history
- See last meal date & OTP verification status

---

## 🔐 Security Features

1. **Admin-Only Access**
   - Only Admin can create/edit/delete packages
   - Managers can assign packages and process orders

2. **OTP Verification**
   - Every meal consumption requires customer OTP
   - Prevents unauthorized package usage
   - 6-digit OTP with 5-minute expiry
   - Max 3 attempts per OTP
   - One-time use (cannot reuse verified OTP)

3. **Complete Audit Trail**
   - Every action logged with user ID
   - Before/after state tracking
   - IP address and user agent capture

4. **Input Validation**
   - All endpoints validated with express-validator
   - Type checking with Zod on frontend
   - SQL injection prevention via parameterized queries

---

## 📊 Use Cases

### Use Case 1: Create Meal Package
**Actor:** Admin
**Flow:**
1. Admin creates "60 Meals Package" for ₹5499
2. Adds "Veg Meals" category as allowed items
3. Package is now available for assignment

### Use Case 2: Onboard Offline Customer ⭐
**Actor:** Admin/Manager
**Flow:**
1. Customer "Rajesh" had 60-meal package offline
2. Already consumed 25 meals
3. Admin assigns package with:
   - totalMeals: 60
   - consumedMeals: 25
   - notes: "Migrated from offline records"
4. System calculates remaining: 35 meals
5. Customer can now use remaining meals with OTP

### Use Case 3: Customer Orders Meal
**Actor:** Manager (at counter)
**Flow:**
1. Customer arrives to redeem meal
2. Manager enters customer phone
3. System shows active package (35 meals remaining)
4. Manager selects "Veg Biryani" from allowed items
5. System sends OTP to customer's phone
6. Customer provides OTP (123456)
7. Manager enters OTP
8. ✅ Order confirmed
9. Meal count: 35 → 34
10. Order marked as "Package Order - OTP Verified"

### Use Case 4: View Package Dashboard
**Actor:** Admin/Manager
**Flow:**
1. Open dashboard
2. See all active packages
3. Search for customer by phone
4. View consumption history
5. Check last meal date
6. Verify OTP status for each order

---

## 🧪 Testing Checklist

### Backend API Tests
- [x] Create meal package (30/60/90)
- [x] List all packages
- [x] Add allowed items (category)
- [x] Assign package to new customer
- [x] Assign package with consumed meals (offline migration)
- [x] Lookup customer by phone
- [x] Get allowed menu items
- [x] Request OTP
- [x] Verify invalid OTP (error handling)
- [x] Dashboard endpoint

### Frontend Tests (To Do)
- [ ] Meal package CRUD interface
- [ ] Package assignment form
- [ ] OTP order wizard (4 steps)
- [ ] Dashboard with search/filter
- [ ] Consumption history view

---

## 🚀 Deployment Notes

### Database Migration
```bash
npm run db:init
```
This creates all 5 tables and extends the orders table.

### Environment Variables
```env
# Existing variables...

# For production SMS (replace mock OTP service)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
```

### Production OTP Service
Replace in-memory storage with Redis:
```javascript
// Use Redis for OTP storage in production
const redis = require('redis');
const redisClient = redis.createClient();
```

---

## 📈 Future Enhancements

1. **Auto-Renewal**
   - Automatically renew packages when completed
   - Send renewal reminders via SMS

2. **Package Analytics**
   - Most popular package
   - Average consumption rate
   - Revenue per package

3. **Customer App**
   - Customers can check remaining meals
   - View consumption history
   - Receive OTP directly in app

4. **Flexible Packages**
   - Custom meal counts
   - Mix & match categories
   - Time-based restrictions (lunch/dinner only)

---

## 📞 Support

**Backend Issues:**
- Check logs in `/var/log/robusters-pos/`
- Verify database migrations ran successfully
- Test API endpoints with Postman

**Frontend Issues:**
- Check browser console for errors
- Verify API endpoint URLs
- Test with mock data first

---

## ✅ Summary

**What's Implemented:**
- ✅ Complete backend API (30+ endpoints)
- ✅ Database schema (5 tables + 1 extended)
- ✅ OTP service with security features
- ✅ Activity logging system
- ✅ TypeScript service layer for frontend
- ✅ Offline user migration support
- ✅ OTP-verified order flow
- ✅ Dashboard with reporting

**What's Pending:**
- ⏳ Frontend UI pages
- ⏳ Integration testing
- ⏳ Production SMS provider integration
- ⏳ Redis for OTP storage (production)

---

**Created by:** Claude Sonnet 4.5
**Date:** January 31, 2026
**Version:** 1.0
