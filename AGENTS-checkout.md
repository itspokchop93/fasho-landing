# FASHO.co — Checkout System Deep Dive

> **For AI agents:** This document covers everything about the checkout process — every step, every API call, every piece of state, the payment gateway setup, and all backend behavior. Read this before touching anything related to checkout, payments, or order creation.

---

## Table of Contents

1. [Overview & Files Involved](#1-overview--files-involved)
2. [Payment Gateway: Square](#2-payment-gateway-square)
3. [Checkout Session System](#3-checkout-session-system)
4. [Checkout Page State Architecture](#4-checkout-page-state-architecture)
5. [Packages & Pricing](#5-packages--pricing)
6. [Add-On Products](#6-add-on-products)
7. [Coupon Code System](#7-coupon-code-system)
8. [FASHOkens Discount at Checkout](#8-fashokens-discount-at-checkout)
9. [Billing Form & Validation](#9-billing-form--validation)
10. [User Account Handling at Checkout](#10-user-account-handling-at-checkout)
11. [Payment Submission Flow (Square)](#11-payment-submission-flow-square)
12. [Order Creation Backend (`/api/create-order`)](#12-order-creation-backend-apicreate-order)
13. [Post-Order Processing](#13-post-order-processing)
14. [Thank-You Page](#14-thank-you-page)
15. [Legacy Authorize.net Code](#15-legacy-authorizenet-code)
16. [Session Recovery & Error Handling](#16-session-recovery--error-handling)
17. [Duplicate Order Prevention](#17-duplicate-order-prevention)
18. [Environment Variables Required](#18-environment-variables-required)
19. [Key Gotchas & Critical Notes](#19-key-gotchas--critical-notes)

---

## 1. Overview & Files Involved

The checkout is a **multi-step single-page experience** where the user:
1. Reviews their selected songs and packages
2. Optionally adds add-ons and applies discounts
3. Fills in billing and account info
4. Pays via Square (card on file in the Square-embedded form)
5. Gets redirected to a thank-you page after the order is created in the database

### Core Files

| File | Purpose |
|---|---|
| `src/pages/checkout.tsx` | Main checkout page (~3,900 lines) — all UI and client-side logic |
| `src/pages/api/square-payment.ts` | Server-side Square payment processor |
| `src/pages/api/create-order.ts` | Creates all DB records after successful payment |
| `src/pages/api/create-checkout-session.ts` | Creates a session in Supabase before checkout |
| `src/pages/api/validate-checkout-session.ts` | Validates a session is still active/unused |
| `src/pages/api/complete-checkout-session.ts` | Marks session as used after successful order |
| `src/pages/api/recover-checkout-session.ts` | Recovers expired sessions if possible |
| `src/pages/api/validate-coupon.ts` | Validates a coupon code |
| `src/pages/api/loyalty/process-order.ts` | Credits/debits FASHOkens after payment |
| `src/pages/thank-you.tsx` | Post-purchase page |
| `src/components/FashokensSection.tsx` | FASHOkens redemption UI in checkout |
| `src/components/StepIndicator.tsx` | Multi-step indicator at top of checkout |
| `src/utils/countryConfig.ts` | Country/state/phone-code config for billing form |
| `src/hooks/useExchangeRates.ts` | Currency display (informational only, not used for charging) |
| `public/iframe-communicator.html` | Used in legacy Authorize.net iframe flow (no longer active for Square) |

---

## 2. Payment Gateway: Square

### Why Square?
Square replaced Authorize.net as the primary payment processor. It provides a PCI-compliant card input form embedded directly on the checkout page via their Web Payments SDK.

### SDK Installation
Square's Web Payments SDK is loaded **client-side** via a `<script>` tag injected into the checkout page. It is **not** installed via npm — it loads directly from Square's CDN:

```
https://sandbox.web.squarecdn.com/v1/square.js   (sandbox)
https://web.squarecdn.com/v1/square.js            (production)
```

The script is injected dynamically via a `useEffect` in `checkout.tsx`:
1. A `<script>` element is created and appended to `document.head`
2. On load, `window.Square.payments(applicationId, locationId)` is called to initialize Square
3. A card payment method is created: `payments.card()`
4. The card form is attached to a DOM element: `card.attach('#card-container')`
5. The `#card-container` div is rendered in the checkout JSX

**Square credentials used client-side (safe to expose):**
- `NEXT_PUBLIC_SQUARE_APP_ID` — Square Application ID (not a secret)
- `NEXT_PUBLIC_SQUARE_LOCATION_ID` — Square Location ID (not a secret)

> These are different from `SQUARE_ACCESS_TOKEN` which is server-side only.

### How the Card Form Works
- Square renders its own secure card fields inside `#card-container`
- The card number, CVV, and expiry are handled entirely by Square in an iframe — Fasho never touches raw card data
- When the user clicks "Complete Purchase," the frontend calls `card.tokenize()` which sends the card data to Square servers and returns a short-lived one-time-use `sourceId` (a nonce/token)
- That `sourceId` is then sent to the Fasho backend (`/api/square-payment`) to complete the actual charge

### Server-Side: `/api/square-payment`

**npm package:** `square` (v43+)

```typescript
import { SquareClient, SquareEnvironment, Country } from 'square';
```

**Critical SDK note:** Square SDK v43+ changed the constructor parameter from `accessToken` to `token`. Also, all monetary amounts are `BigInt` internally — amounts returned in the response must be converted with `Number()` before JSON serialization, otherwise you get a `TypeError: Do not know how to serialize a BigInt` error.

**Request body:**
```typescript
{
  sourceId: string;      // One-time payment token from Square Web SDK
  amount: number;        // Dollar amount (e.g. 149.00)
  orderItems: { name: string; price: number }[];  // For display/logging
  customerEmail: string;
  billingInfo: {
    firstName, lastName, address, address2?,
    city, state, zip, country, countryCode?, phoneNumber?
  };
}
```

**What the server does:**
1. Validates all required fields are present
2. Reads `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT` from env
3. Initializes `SquareClient` with `token` and `environment`
4. Converts dollar amount → cents: `Math.round(amount * 100)`
5. Generates a `uuidv4()` idempotency key (prevents duplicate charges on retry)
6. Calls `client.payments.create(...)` with:
   - `sourceId` (the payment token from client)
   - `idempotencyKey` (unique per request)
   - `amountMoney: { amount: BigInt(amountInCents), currency: 'USD' }`
   - `locationId`
   - `buyerEmailAddress`
   - `billingAddress` (mapped from Fasho billing fields to Square fields)
   - `note: 'Focused Founders - X package(s)'`
   - `statementDescriptionIdentifier: 'FOCUSED FOUNDERS'`
7. Checks `paymentResult.status === 'COMPLETED'`
8. On success: returns `{ success: true, payment: { transactionId, status, receiptUrl, totalMoney, createdAt } }`
9. On failure: maps Square error codes to user-friendly messages via `getDeclineReason()`

**Error code mapping** covers 25+ specific Square error codes including:
- `INSUFFICIENT_FUNDS`, `CARD_DECLINED`, `CVV_FAILURE`, `INVALID_EXPIRATION`
- `CARD_EXPIRED`, `FRAUD_REJECTED`, `ADDRESS_VERIFICATION_FAILURE`
- `CARD_TOKEN_USED` (replay attack protection)
- Fallback: generic "please try a different card" message

**Environment toggle:**
```
SQUARE_ENVIRONMENT=sandbox    → SquareEnvironment.Sandbox
SQUARE_ENVIRONMENT=production → SquareEnvironment.Production
```

---

## 3. Checkout Session System

Before the user even sees the checkout page, a **checkout session** is created in Supabase. This prevents data loss, enables session recovery, and prevents replay attacks (charging the same order twice).

### Database Table: `checkout_sessions`
```
id          UUID PK (the session ID passed in URL)
user_id     UUID (null for guests)
session_data JSONB { tracks, selectedPackages, userId }
status      VARCHAR: 'active' | 'expired' | 'used' | 'invalidated'
is_used     BOOLEAN (true once order is created)
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

### Session Lifecycle

**Step 1 — Create Session**
When user clicks "Proceed to Checkout" from the packages page:
- Frontend calls `POST /api/create-checkout-session` with `{ tracks, selectedPackages, userId, existingSessionId? }`
- If `existingSessionId` is provided (user is navigating back to change packages), the old session is marked `invalidated` first
- New session row is inserted with `status: 'active'`, `is_used: false`
- The generated `sessionId` UUID is returned
- User is navigated to `/checkout?sessionId=<uuid>`

**Step 2 — Validate Session**
On checkout page load, `POST /api/validate-checkout-session` is called with `{ sessionId }`:
- Fetches session from Supabase (using service role client to bypass RLS)
- Checks `is_used === false` → if true, returns `reason: 'already_used'`
- Checks `status === 'active'` → if not, returns `reason: 'expired'`
- Checks age < 24 hours → if older, marks status as `expired` and returns `reason: 'expired'`
- On success, returns `{ isValid: true, sessionData: { tracks, selectedPackages, userId } }`
- The checkout page loads track and package data from `sessionData` (not from URL params)

**Step 3 — Complete Session**
After `POST /api/create-order` succeeds:
- Frontend calls `POST /api/complete-checkout-session` with `{ sessionId }`
- Session is updated: `status: 'used'`, `is_used: true`
- This prevents the session from being reused (e.g., if user hits back after purchase)

### Session Recovery
If validation returns `reason: 'expired'`:
- Checkout attempts `POST /api/recover-checkout-session` with `{ userId, expiredSessionId }`
- If recovery succeeds, user is redirected to the new session URL
- If recovery fails, user sees a friendly message and is redirected to `/add` to start over after 3 seconds

### Backward Compatibility
Checkout also handles old-style URLs (`?tracks=...&selectedPackages=...`) by creating a new session on the fly and redirecting to the session-based URL.

---

## 4. Checkout Page State Architecture

`checkout.tsx` manages a large amount of state. Key state variables:

```typescript
// Order data
tracks: Track[]                          // Songs being promoted
selectedPackages: {[key: number]: string} // Package per track index
orderItems: OrderItem[]                   // Built from tracks + packages
selectedAddOns: Set<string>              // Add-on IDs user selected
addOnOrderItems: AddOnOrderItem[]        // Add-on display objects

// Pricing
subtotal: number          // Sum of all item original prices
discount: number          // Sum of multi-song discounts + add-on sale discounts
total: number             // Final amount to charge
totalBeforeFashokens: number  // Total after coupon, before FASHOkens applied

// Discounts
appliedCoupon: CouponObject | null      // Validated coupon from DB
appliedFashokens: number                // Token count being spent
fashokensDiscount: number               // Dollar discount from tokens

// Session
sessionId: string                       // UUID from checkout_sessions table

// User/Auth
currentUser: User | null                // From useAuth() context
authLoading: boolean

// Form
formData: { email, password, confirmPassword }  // Account creation/login
billingData: { firstName, lastName, address, address2, city, state, zip, country, countryCode, phoneNumber, musicGenre }
termsAgreed: boolean

// UI state
isLoading: boolean
isProcessingPayment: boolean            // Prevents double-clicks
showProcessingPopup: boolean
error: string
formError: string
emailStatus: 'available' | 'exists' | 'invalid' | 'error' | null
isLoginMode: boolean                    // Toggle between signup/login

// Duplicate prevention (refs, not state)
orderProcessingFlag: React.MutableRefObject<boolean>
processedTransactionIdsRef: React.MutableRefObject<Set<string>>
```

### Total Calculation Logic (`updateTotals`)

Called whenever any of these change: `orderItems`, `addOnOrderItems`, `appliedCoupon`, `fashokensDiscount`

```
mainSubtotal = sum of all orderItem.originalPrice
mainDiscount = sum of (originalPrice - discountedPrice) for discounted items

addOnSubtotal = sum of all addOnItem.originalPrice
addOnDiscount = sum of (originalPrice - salePrice) for on-sale add-ons

totalSubtotal = mainSubtotal + addOnSubtotal
totalDiscount = mainDiscount + addOnDiscount
preTotalBeforeCoupon = totalSubtotal - totalDiscount

if (appliedCoupon):
  couponDiscount = appliedCoupon.calculated_discount
  totalAfterCoupon = max(0, preTotalBeforeCoupon - couponDiscount)

totalBeforeFashokens = totalAfterCoupon (stored separately for FashokensSection)

if (fashokensDiscount > 0):
  finalTotal = max(1, totalAfterCoupon - fashokensDiscount)  // Minimum $1
else:
  finalTotal = totalAfterCoupon
```

**Multi-song discount rule:** The first song is always full price. Every additional song in the same order gets 25% off (rounded up). This is applied when building `orderItems` from `sessionData`, not at checkout form submission time.

---

## 5. Packages & Pricing

Defined as a constant in `checkout.tsx` (not fetched from DB):

| ID | Name | Price | Streams | Playlist Pitches |
|---|---|---|---|---|
| `test` | TEST PACKAGE | $0.10 | 1–5 | 1–2 |
| `breakthrough` | BREAKTHROUGH | $39 | 3,000–3,500 | 10–12 |
| `momentum` | MOMENTUM | $79 | 7,500–8,500 | 25–30 |
| `dominate` | DOMINATE | $149 | 18,000–20,000 | 60–70 |
| `unstoppable` | UNSTOPPABLE | $259 | 45,000–50,000 | 150–170 |
| `legendary` | LEGENDARY | $479 | 125,000–150,000 | 375–400 |

> The `test` package exists for development and end-to-end testing. It charges $0.10 and processes through Square like any real order.

---

## 6. Add-On Products

Also defined as constants in `checkout.tsx` (not fetched from DB):

| ID | Name | Sale Price | Original Price |
|---|---|---|---|
| `express-launch` | EXPRESS: 8hr Rapid Launch | $14 | $28 |
| `discover-weekly-push` | Guaranteed 'Discover Weekly' Push | $19 | $38 |

**Discount calculation:** `salePrice = originalPrice * 0.75` rounded up (25% off). The sale is always active — there is no toggle.

**Persistence:** Selected add-ons are saved to `localStorage` key `selectedAddOns` (as a JSON array of IDs) so they survive page refreshes within the same session.

**Behavior when session changes:** When a new session ID is detected (user changed their package selection and got a new session), `selectedAddOns` localStorage is cleared and add-ons reset to empty.

---

## 7. Coupon Code System

### UI Flow
1. User types a code into the coupon input field
2. Clicks "Apply" → `handleApplyCoupon()` is called
3. Calculates `preCouponTotal = subtotal - discount` (total before coupon, after multi-song discounts)
4. Calls `POST /api/validate-coupon` with `{ coupon_code, order_amount: preCouponTotal }`

### Validation API (`/api/validate-coupon`)
- Uses **service role** Supabase client (bypasses RLS)
- Calls PostgreSQL function: `validate_coupon_code(input_code, order_amount)`
- The DB function handles all business logic:
  - Case-insensitive code lookup
  - Checks `is_active`, `starts_at`, `expires_at`
  - Checks `current_usage < usage_limit` (if limit set)
  - Checks `order_amount >= min_order_amount`
  - Calculates `calculated_discount` based on `discount_type`:
    - `percentage`: `order_amount * (discount_value / 100)`, capped by `max_discount_amount` if set
    - `flat`: `discount_value` flat, capped to not exceed `order_amount`
- Returns: `{ is_valid, coupon_id, discount_type, discount_value, calculated_discount, error_message? }`

### On Success
- `appliedCoupon` state is set with the coupon data
- A green toast notification appears ("Coupon applied! You saved $X.XX")
- The input field is cleared
- `updateTotals()` re-runs and deducts `calculated_discount` from the total

### On Failure
- `couponError` state is set → shown in red below the input

### Removal
User clicks "Remove" → `appliedCoupon` set to null → `updateTotals()` re-runs

### Important: Coupon Usage NOT Tracked at Validation
Coupon `current_usage` is incremented **only** during order creation (`/api/create-order`), not at validation time. This means a user could validate a coupon and then abandon checkout without consuming a use. This is intentional — usage should only count on completed purchases.

---

## 8. FASHOkens Discount at Checkout

### Component
`src/components/FashokensSection.tsx` — rendered inside the checkout page

### Data Required
- User must be logged in (`currentUser !== null`)
- Fetched via `GET /api/user/fashokens?userId=...`
- Also fetches loyalty settings: `GET /api/loyalty/settings` to get `tokens_per_dollar` (default 100) for displaying "you'll earn X tokens"

### Redemption Rate
Configured in `loyalty_settings` table, default:
- Earn: 100 tokens per $1 spent
- Redeem: 1,000 tokens per $1 discount

So 1,000 tokens = $1 off.

### How It Works in Checkout
1. User toggles "Use FASHOkens" switch
2. `FashokensSection` calculates max tokens that can be applied: `Math.floor(totalBeforeFashokens * redemptionRate)` capped at user's balance
3. A slider or input lets user choose how many tokens to apply
4. `setAppliedFashokens(tokens)` and `setFashokensDiscount(tokens / redemptionRate)` are called
5. `updateTotals()` re-runs: `finalTotal = max(1, totalAfterCoupon - fashokensDiscount)` — minimum $1 enforced

### At Order Completion
- Tokens are **NOT** deducted at checkout form time — only after payment succeeds
- Once `POST /api/create-order` succeeds, `POST /api/loyalty/process-order` is called
- That API both debits spent tokens AND credits earned tokens atomically via PostgreSQL RPCs

---

## 9. Billing Form & Validation

### Fields Collected
```typescript
billingData = {
  firstName: string,
  lastName: string,
  address: string,       // Street address line 1
  address2: string,      // Optional line 2
  city: string,
  state: string,         // 2-letter code (required only if country has states)
  zip: string,
  country: string,       // 2-letter ISO code, default 'US'
  countryCode: string,   // Phone country code, default '+1'
  phoneNumber: string,
  musicGenre: string     // Stored in billing_info JSONB, used for playlist matching
}
```

### Country Config
`src/utils/countryConfig.ts` — `COUNTRY_CONFIGS` map drives dynamic form rendering:
- `hasStates: boolean` — whether to show state dropdown
- `phoneCode: string` — auto-populated phone prefix
- `zipLabel: string` — shows "ZIP Code", "Postal Code", etc.

When `country` changes:
- `countryCode` is auto-updated to the country's phone prefix
- If new country doesn't use states, `state` is cleared

### Form Validation (`isFormValid()`)
Rules depend on whether user is logged in:

**Logged-in user:**
- `firstName`, `lastName`, `address`, `city`, `zip`, `phoneNumber`, `musicGenre` all required
- `state` required only if `countryConfig.hasStates === true`
- `termsAgreed` must be true

**Guest (signup mode):**
- All above + `email` (must have `emailStatus === 'available'`), `password` (8+ chars, 1 uppercase, 1 number), `confirmPassword` must match
- No field errors on password fields

**Guest (login mode):**
- All billing fields + `email`, `password`

### Email Existence Check
As user types their email (debounced 500ms), `POST /api/check-user-exists` is called:
- Returns `{ exists: true/false }`
- If `exists === true` and user is in signup mode → `emailStatus = 'exists'` → inline warning shown → "switch to login mode"
- If `exists === false` → `emailStatus = 'available'` → green checkmark
- If format invalid → `emailStatus = 'invalid'`

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- (Special char optional per the `getPasswordRequirements` check but not enforced in `isFormValid`)

### Autofill for Logged-In Users
When `currentUser` is detected, `autofillUserProfile()` is called:
- `GET /api/user-profile` returns saved billing data from `user_profiles` table
- Fields are pre-populated: `firstName`, `lastName`, `address`, `address2`, `city`, `state`, `zip`, `country`, `phoneNumber`
- User can still edit everything

### Terms Agreement
User must check a single checkbox agreeing to Terms & Conditions, Privacy Policy, Disclaimer, and Refund Policy. Each of these opens in a `LegalModal` component when clicked.

---

## 10. User Account Handling at Checkout

### Scenario 1: Already Logged In
- All account fields hidden
- Only billing form + music genre + terms shown
- `userId = currentUser.id` used for order
- No account creation happens

### Scenario 2: Guest — New Account (Signup Mode)
User fills in email + password + confirm password.

**Account creation happens at the start of `handlePaymentSubmit()`** (before Square tokenization):
1. `POST /api/check-user-exists` → if user doesn't exist, `supabase.auth.signUp()` is called
2. New Supabase auth user is created with `full_name` in `user_metadata`
3. `POST /api/sync-user-profile` is called to write billing data to `user_profiles` table
4. The new `userId` is included in the order creation payload

> **Why account is created before payment:** This ensures the order is linked to a user ID if the account was just created.

### Scenario 3: Guest — Existing Account (Login Mode)
User enters email + password. During `handlePaymentSubmit()`:
1. `POST /api/check-user-exists` → user exists
2. `supabase.auth.signInWithPassword()` is called
3. On success, `userId` from the signed-in session is used for the order
4. On failure (wrong password) → error shown, payment stops

### After Payment — Account Confirmation
On the thank-you page, if `newAccountCreated` is true in the order data, a message is shown telling the user they have a new account. They'll receive an email to confirm it (Supabase sends this automatically).

---

## 11. Payment Submission Flow (Square)

This is the most critical section — what happens when the user clicks "Complete Purchase."

### Step 1: Form Validation
`handleSubmit(e)` is called:
1. `e.preventDefault()`
2. `isFormValid()` checked → if false, scroll to first missing field and show error message
3. Analytics event: `checkout_submitted`
4. Calls `handlePaymentSubmit()`

### Step 2: Prepare Payment Data (`handlePaymentSubmit`)
1. Defensive: truncate `state` and `country` to 2 characters
2. Build `paymentOrderItems`: array of `{ name, price }` for all order items + add-ons
3. Store `pendingOrder` in `sessionStorage`:
   ```json
   {
     "items": [...orderItems],
     "addOnItems": [...addOnOrderItems],
     "subtotal": 149,
     "discount": 0,
     "total": 149,
     "customerEmail": "...",
     "customerName": "John Doe",
     "billingInfo": {...},
     "coupon": null | { id, code, discount_type, calculated_discount },
     "fashokens": { "spent": 0, "discount": 0 },
     "paymentToken": "...",
     "createdAt": "2026-03-03T..."
   }
   ```

### Step 3: Handle New User Account (if needed)
If user is not logged in:
- Check if email exists → sign in or sign up
- Sync user profile to `user_profiles` table

### Step 4: Tokenize Card via Square SDK
```javascript
const result = await card.tokenize();
if (result.status === 'OK') {
  const sourceId = result.token; // e.g. "cnon:card-nonce-ok"
  // proceed to charge
} else {
  // show validation errors from result.errors
}
```

Square validates card fields on the client side and returns either:
- `status: 'OK'` + `token` (a one-time nonce)
- `status: 'Invalid'` + `errors` array (e.g., "Card number is invalid")

### Step 5: Charge via Square Backend
`POST /api/square-payment`:
```json
{
  "sourceId": "cnon:...",
  "amount": 149,
  "orderItems": [{ "name": "Track - DOMINATE", "price": 149 }],
  "customerEmail": "user@example.com",
  "billingInfo": { "firstName": "John", "lastName": "Doe", ... }
}
```

Response on success:
```json
{
  "success": true,
  "payment": {
    "transactionId": "sq_payment_id",
    "status": "COMPLETED",
    "receiptUrl": "https://squareup.com/receipt/...",
    "totalMoney": { "amount": 14900, "currency": "USD" },
    "createdAt": "2026-03-03T..."
  }
}
```

### Step 6: Show Processing Popup
Immediately after payment succeeds, `setShowProcessingPopup(true)` — a full-screen "Processing your order..." overlay is shown while the order is being saved to the database.

### Step 7: Call `handleSuccessfulPayment(paymentResponse)`
This is the function that does everything after a successful charge. It receives the Square payment response object.

---

## 12. Order Creation Backend (`/api/create-order`)

Called via `POST /api/create-order` after successful Square payment.

### Input Payload
```typescript
{
  items: OrderItem[],          // From sessionStorage pendingOrder
  addOnItems: AddOnOrderItem[],
  subtotal: number,
  discount: number,
  total: number,
  customerEmail: string,
  customerName: string,
  billingInfo: BillingInfo,
  paymentData: {
    transactionId: string,     // Square payment ID
    authorization: string,
    accountNumber: string,
    accountType: string
  },
  coupon?: CouponObject | null,
  userId?: string
}
```

### Step-by-Step Backend Logic

#### 1. Generate Order Number
`generateOrderNumber(supabase)` — sequential numbering:
1. Fetches all existing order numbers from `orders` table
2. Strips `FASHO-` prefix if present (handles both old and new format)
3. Finds the highest existing numeric order number
4. Increments by 1 + adds random offset 0–9 (to reduce concurrent conflicts)
5. Checks if that number already exists (race condition protection)
6. Returns the number as a plain string (e.g., `"3042"`)
7. Retries up to 5 times with fallback to timestamp-based IDs

**Order number format:** Plain integer strings starting from 3001 (e.g., `"3001"`, `"3042"`, `"3101"`). Old orders may have `FASHO-XXXX` format.

#### 2. Insert `orders` Row
```sql
INSERT INTO orders (
  order_number, user_id, customer_email, customer_name,
  subtotal, discount, total,
  status, payment_status,
  billing_info, payment_data,
  coupon_id, coupon_code, coupon_discount,
  created_at, updated_at
) VALUES (...)
```
Initial status is always `'processing'`. Payment status is `'paid'`.

Uses `createAdminClient()` (service role) to bypass RLS.

On duplicate `order_number` (23505 unique constraint error), retries up to 3 times with a new number.

#### 3. Insert `order_items` Rows
One row per track/package combination. Stores full track metadata (title, artist, Spotify URL, image URL, artist profile URL) and full package metadata.

If `order_items` insert fails, the `orders` row is deleted (cleanup) and a 500 is returned.

#### 4. Insert `add_on_items` Rows
If any add-ons were selected, inserts rows into `add_on_items`.
- Prices stored in **cents** (multiplied by 100)
- Failures here do NOT fail the entire order — logged only

#### 5. Track Coupon Usage
If a coupon was applied:
1. Inserts a row into `coupon_usage` table: `{ coupon_id, order_id, customer_email, discount_amount }`
2. Calls Supabase RPC `increment_coupon_usage(coupon_uuid)` to increment `current_usage` counter on `coupon_codes`
- Failures here do NOT fail the order — logged only

#### 6. Send Email Notifications
Calls `sendNewOrderEmail()` and `sendAdminNewOrderEmail()` from `emailService.ts`:
- Customer gets a confirmation email (uses the `order_placed` trigger type from `email_templates`)
- Admin gets a notification email
- Both use MailJet REST API
- Email failures do NOT fail the order — logged only

#### 7. Sync User Profile
If `userId` is present, calls `POST /api/sync-user-profile` to update `user_profiles` table with the billing info used in this order. Keeps billing data current for future autofill. Non-blocking.

#### 8. Send Zapier Webhook
Fires a `checkout_success` Zapier webhook with:
- Customer name, email, phone, billing address
- Order date, total, number, packages ordered

Webhook URL fetched from `admin_settings.zapier_webhook_url`. Non-blocking — never fails the order.

#### 9. Create Airtable Record
Creates a record in Airtable via `AirTableService.createCheckoutRecord()`.
- Stores: customer first/last name, email, phone, billing address, packages, total, order number
- Non-blocking — never fails the order

#### 10. Push to MailerLite
Adds/updates subscriber in MailerLite:
- Fetches active MailerLite group IDs from `admin_settings` table
- Calls `pushSubscriberToMailerLite()` with customer info
- Non-blocking — never fails the order

#### 11. Return Success
```json
{
  "success": true,
  "order": {
    "id": "uuid",
    "orderNumber": "3042",
    "total": 149,
    "createdAt": "2026-03-03T..."
  }
}
```

---

## 13. Post-Order Processing

After `POST /api/create-order` succeeds, the frontend does several more things:

### A. Track PostHog Purchase Event
```typescript
analytics.trackPurchase({
  order_id, order_number, total, subtotal, discount,
  coupon_code, package_name, package_id,
  track_title, track_artist, item_count, is_first_purchase
})
```

### B. Mark Checkout Session as Used
`POST /api/complete-checkout-session` with `{ sessionId }`:
- Sets `status: 'used'`, `is_used: true` on the session row
- Prevents session replay if user hits back

### C. Process FASHOkens (`POST /api/loyalty/process-order`)
```json
{
  "userId": "...",
  "orderId": "...",
  "orderNumber": "3042",
  "orderTotal": 149,
  "couponDiscount": 0,
  "fashokensSpent": 1000,
  "fashokensDiscount": 1.00
}
```

The API does:
1. Fetches `loyalty_settings` (earn/redeem rates, program active flag)
2. If `fashokensSpent > 0`: calls `debit_fashokens` RPC to deduct tokens
3. Calculates `actualPaid = orderTotal - couponDiscount - fashokensDiscount`
4. Calculates `tokensEarned = Math.floor(actualPaid * tokensPerDollar)`
5. Calls `credit_fashokens` RPC to add earned tokens
6. Updates `orders.fashokens_spent`, `orders.fashokens_earned`, `orders.fashokens_discount_amount`
7. Returns new balance, tokens spent, tokens earned

**Important:** Tokens are earned on the **actual amount paid** (after all discounts), not the list price.

### D. Store Completed Order in sessionStorage
All order data is stored in `sessionStorage` key `completedOrder`:
```json
{
  "items": [...],
  "addOnItems": [...],
  "subtotal": 149,
  "discount": 0,
  "total": 149,
  "customerEmail": "...",
  "customerName": "...",
  "newAccountCreated": false,
  "orderNumber": "3042",
  "orderId": "uuid",
  "paymentData": { "transactionId": "sq_payment_id", ... },
  "createdAt": "...",
  "couponId": null,
  "couponCode": null,
  "couponDiscount": null,
  "fashokensSpent": 0,
  "fashokensEarned": 14900,
  "fashokensDiscount": 0,
  "fashokensNewBalance": 14900
}
```

### E. Clean Up
- `sessionStorage.removeItem('pendingOrder')`
- `localStorage.removeItem('selectedAddOns')`

### F. Redirect to Thank-You Page
```typescript
router.push(`/thank-you?order=${orderResult.order.orderNumber}`)
// Fallback: window.location.href = `/thank-you?order=3042`
```

---

## 14. Thank-You Page

**Route:** `/thank-you?order=3042`

**Data source:** `sessionStorage.completedOrder` (primary). If not found, a minimal fallback is shown.

### What it displays:
- Order number
- Track art, title, artist
- Package name, plays range, placements range
- Add-ons purchased
- Pricing breakdown: subtotal → discounts → coupon → FASHOkens → **Total paid**
- FASHOkens earned/spent in this order + new balance
- Payment confirmation with Square transaction ID
- If `newAccountCreated === true`: message about the new account

### Analytics Fired on Thank-You Page Load:
- **Google Ads conversion:** `gtag('event', 'conversion', { 'send_to': '...', 'value': total, 'currency': 'USD' })`
- **Google Analytics purchase event:** `gtag('event', 'purchase', { transaction_id, value, currency, items: [...] })`
- **PostHog:** already tracked in checkout (`analytics.trackPurchase(...)`)

### Intake Form
`IntakeFormModal` is shown if the user hasn't completed it. It collects:
- Artist goals (social media growth, streaming, etc.)
- Artist name
- Links (Spotify, Instagram, website)
- Genre

On submission, triggers a Zapier webhook with `event_type: 'intake_form_thank_you'`.

---

## 15. Authorize.net Accept Hosted — Complete Iframe Communication System

This was the **original payment system** before Square and the code is **fully intact and operational** in the codebase. It uses Authorize.net's "Accept Hosted" product, which works completely differently from Square. Understanding this system is critical because `checkout.tsx`'s entire `handlePaymentSubmit` → `handleSuccessfulPayment` pipeline was built around it, and the Authorize.net flow is still wired into the main checkout page.

### What is Accept Hosted?
Accept Hosted is Authorize.net's PCI-compliant hosted payment form. Instead of rendering card fields on your own page (like Square does), Authorize.net renders its own credit card form inside an **iframe** that is hosted on Authorize.net's servers (`https://accept.authorize.net`). Your site never touches the raw card data at all — Authorize.net handles everything inside their iframe, then communicates the result back to your page using a special nested iframe + postMessage bridge.

---

### Files Involved

| File | Purpose |
|---|---|
| `src/pages/api/generate-payment-token.ts` | Server-side: requests a one-time hosted payment page token from Authorize.net API |
| `src/pages/checkout.tsx` | Client-side: embeds the Authorize.net iframe, listens for payment result via postMessage |
| `src/pages/api/process-payment-accept.ts` | Alternative server-side charge handler using Authorize.net's opaque data (Accept.js approach) |
| `src/pages/checkout-accept.tsx` | Alternate checkout page using Accept.js (card fields embedded directly, different from Accept Hosted) |
| `public/iframe-communicator.html` | **The bridge page** — a static HTML file hosted at `https://www.fasho.co/iframe-communicator.html` that Authorize.net loads inside a nested iframe to relay messages cross-origin |
| `public/iframe-communicator-local.html` | Local dev version of the bridge page |

---

### The Complete Authorize.net Accept Hosted Flow

#### Step 1: Generate a Hosted Payment Page Token
When the user fills out the billing form and clicks "Complete Purchase":

Frontend calls `POST /api/generate-payment-token` with:
```json
{
  "amount": 149.00,
  "orderItems": [{ "name": "Track - DOMINATE", "price": 149 }],
  "customerEmail": "user@example.com",
  "billingInfo": { "firstName": "John", "lastName": "Doe", "address": "...", ... }
}
```

The server calls the Authorize.net XML API at `https://api.authorize.net/xml/v1/request.api` with a `getHostedPaymentPageRequest`:

```json
{
  "getHostedPaymentPageRequest": {
    "merchantAuthentication": {
      "name": "AUTHORIZE_NET_API_LOGIN_ID",
      "transactionKey": "AUTHORIZE_NET_TRANSACTION_KEY"
    },
    "transactionRequest": {
      "transactionType": "authCaptureTransaction",
      "amount": "149.00",
      "order": { "invoiceNumber": "INV12345678" },
      "customer": { "email": "user@example.com" },
      "billTo": { "firstName": "John", "lastName": "Doe", ... }
    },
    "hostedPaymentSettings": {
      "setting": [
        {
          "settingName": "hostedPaymentIFrameCommunicatorUrl",
          "settingValue": "{\"url\": \"https://www.fasho.co/iframe-communicator.html\"}"
        },
        {
          "settingName": "hostedPaymentReturnOptions",
          "settingValue": "{\"showReceipt\": false, \"url\": \"https://www.fasho.co/thank-you\", \"cancelUrl\": \"https://www.fasho.co/checkout\"}"
        },
        {
          "settingName": "hostedPaymentStyleOptions",
          "settingValue": "{\"bgColor\": \"#49ba87\"}"
        },
        {
          "settingName": "hostedPaymentPaymentOptions",
          "settingValue": "{\"cardCodeRequired\": true, \"showCreditCard\": true, \"showBankAccount\": false}"
        },
        {
          "settingName": "hostedPaymentBillingAddressOptions",
          "settingValue": "{\"show\": false, \"required\": false}"
        },
        {
          "settingName": "hostedPaymentOrderOptions",
          "settingValue": "{\"show\": true, \"merchantName\": \"FASHO.co\"}"
        },
        {
          "settingName": "hostedPaymentButtonOptions",
          "settingValue": "{\"text\": \"Complete Checkout\"}"
        }
      ]
    }
  }
}
```

**Key settings explained:**
- `hostedPaymentIFrameCommunicatorUrl` — **this is the heart of the cross-origin communication system** (see below)
- `hostedPaymentBillingAddressOptions: show: false` — Authorize.net's billing address fields are hidden because we collect billing info ourselves before this step
- `hostedPaymentStyleOptions: bgColor: #49ba87` — matches the Fasho green brand color inside the Authorize.net form
- `showBankAccount: false` — only credit card is offered, no ACH/bank

Authorize.net responds with a single-use token string (valid for ~15 minutes). The server returns:
```json
{
  "success": true,
  "token": "a8F8x9...",
  "paymentFormUrl": "https://accept.authorize.net/payment/payment"
}
```

---

#### Step 2: Embed the Authorize.net Iframe
Back in the browser, `checkout.tsx` receives the token and:

1. Stores the full `pendingOrder` data in `sessionStorage` (critical — happens before the iframe is shown)
2. Sets `paymentToken` and `paymentFormUrl` in React state
3. `showPaymentForm` is set to `true`

This triggers a `useEffect` that calls `submitTokenToIframe()` after a 1-second DOM-ready delay.

**The iframe structure in the JSX:**
```html
<!-- Hidden form that submits the token TO the Authorize.net iframe -->
<form
  id="paymentIframeForm"
  method="post"
  action="https://accept.authorize.net/payment/payment"
  target="paymentIframe"
>
  <input type="hidden" name="token" value={paymentToken} />
</form>

<!-- The actual iframe where Authorize.net's card form renders -->
<iframe
  id="paymentIframe"
  name="paymentIframe"
  src="about:blank"
  width="100%"
  height="650"
/>
```

**`submitTokenToIframe()`** finds the form by `id="paymentIframeForm"` and calls `.submit()`. This sends the `token` as a POST body to `https://accept.authorize.net/payment/payment` — but crucially, it targets the `paymentIframe` element by name. The result: Authorize.net's card form loads **inside the iframe** on the page.

The user now sees a PCI-compliant card entry form rendered by Authorize.net inside Fasho's checkout page — they enter their card number, CVV, and expiry directly into Authorize.net's secure form.

---

#### Step 3: The Nested Iframe Communication Bridge

This is the most complex part. After the user submits their card inside the iframe, Authorize.net needs to send the result back to Fasho's page. **This is a cross-origin problem** — the iframe is at `accept.authorize.net` but the parent page is at `fasho.co`. Browsers block direct cross-origin postMessage when origins don't match.

Authorize.net's solution: **a nested iframe bridge**.

When Fasho requested the payment token, it provided `hostedPaymentIFrameCommunicatorUrl: "https://www.fasho.co/iframe-communicator.html"`. This tells Authorize.net to load **another iframe** — a Fasho-owned page — inside the Authorize.net iframe. Because `iframe-communicator.html` is served from `fasho.co` (the same origin as the checkout page), it CAN use `postMessage` to talk to the parent `fasho.co` checkout page.

**The iframe nesting looks like this:**
```
fasho.co/checkout (parent page — listens for postMessage)
  └── accept.authorize.net/payment/payment (Authorize.net card form iframe)
        └── fasho.co/iframe-communicator.html (bridge page — same origin as parent)
```

**How `iframe-communicator.html` works:**

The file at `public/iframe-communicator.html` is a static HTML page with inline JavaScript. It does three things:

1. **Exposes `window.AuthorizeNetIFrame.onReceiveCommunication`** — a globally-named function that Authorize.net's form script calls directly on this window when a payment event occurs. Authorize.net calls it with a URL-encoded query string like `action=transactResponse&response={"transId":"123",...}`.

2. **Parses the query string** — `parseQueryString(querystr)` splits on `&` and `=` to produce a key-value map.

3. **Relays the message to the top/parent window via `postMessage`** — `sendToAllParents(message)` tries `window.top.postMessage(...)` and `window.parent.postMessage(...)`. Because the communicator page is same-origin with the checkout page, this call succeeds.

**Events handled by the bridge:**
```javascript
switch (params["action"]) {
  case "transactResponse":
    // User completed payment — send result to parent
    var response = JSON.parse(params["response"]);
    sendToAllParents({
      type: 'PAYMENT_COMPLETE',
      action: 'transactResponse',
      response: response  // contains transId, responseCode, etc.
    });
    break;

  case "cancel":
    // User cancelled
    sendToAllParents({ type: 'PAYMENT_CANCELLED', action: 'cancel' });
    break;

  case "successfulSave":
    // Payment profile saved
    sendToAllParents({ type: 'PAYMENT_SUCCESS', action: 'successfulSave' });
    break;

  case "resizeWindow":
    // Authorize.net wants to resize the iframe
    sendToAllParents({
      type: 'RESIZE_IFRAME',
      width: parseInt(params["width"]),
      height: parseInt(params["height"])
    });
    break;
}
```

---

#### Step 4: Checkout Page Listens for postMessage
Back in `checkout.tsx`, a `window.addEventListener('message', ...)` listener was set up to receive messages from the bridge. When `type: 'PAYMENT_COMPLETE'` arrives with the Authorize.net transaction response:

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'PAYMENT_COMPLETE') {
    const { response } = event.data;
    // response contains: transId, responseCode, authorization, accountNumber, accountType
    handleSuccessfulPayment(response);
  }
  if (event.data.type === 'PAYMENT_CANCELLED') {
    // Reset UI, show cancellation message
  }
  if (event.data.type === 'RESIZE_IFRAME') {
    // Dynamically resize the iframe element
  }
});
```

**`handleSuccessfulPayment(response)`** then runs all the post-payment logic: create order in DB, process FASHOkens, send emails, redirect to thank-you.

---

#### Why the `iframe-communicator.html` Must Be on Production URLs
The token request to Authorize.net hardcodes the communicator URL:
```javascript
iframeCommunicatorBaseUrl = 'https://www.fasho.co';
// Result: https://www.fasho.co/iframe-communicator.html
```

**This URL must be publicly accessible.** Authorize.net's servers load it inside their iframe — so `localhost` or private URLs will NOT work. This is why the code always uses production URLs for Authorize.net even in local dev.

For local testing, `public/iframe-communicator-local.html` exists as a variant but Authorize.net still needs to reach the production URL to load it.

---

#### Why `handleSuccessfulPayment` Also Works with Square
The current `checkout.tsx` flow calls `handlePaymentSubmit()` which (depending on the checkout variant used) either:
- Uses Square's `card.tokenize()` → calls `/api/square-payment` → calls `handleSuccessfulPayment(squareResponse)` directly
- Uses Authorize.net token flow → shows iframe → receives postMessage → calls `handleSuccessfulPayment(authorizeNetResponse)` via event listener

Both payment providers funnel into the same `handleSuccessfulPayment` function. The function reads `sessionStorage.pendingOrder` (set before either payment flow begins) so it doesn't depend on the specific response shape.

---

### Env Variables (Authorize.net)
```
AUTHORIZE_NET_API_LOGIN_ID=        # From Authorize.net merchant account
AUTHORIZE_NET_TRANSACTION_KEY=     # From Authorize.net merchant account
AUTHORIZE_NET_ENVIRONMENT=production  # Must be exactly 'production' — the code enforces this
```

> **Critical:** The server enforces `AUTHORIZE_NET_ENVIRONMENT === 'production'` and rejects sandbox configs. This prevents accidentally charging test cards in production.

### Authorize.net Validation Rules
The `generate-payment-token` API also validates billing field lengths against Authorize.net's limits:
- First/last name: max 50 chars
- Address: max 60 chars
- City: max 40 chars
- Email: max 255 chars
- ZIP/postal code: regex `^[A-Za-z0-9\s\-]{2,10}$`
- Country: must be exactly 2 characters (ISO 3166-1 alpha-2)
- State: required only for US, CA, AU — max 3 chars

---

## 16. Session Recovery & Error Handling

### Expired Session (`reason: 'expired'`)
1. Frontend receives `{ error: 'expired', reason: 'expired' }` from `/api/validate-checkout-session`
2. Attempts `POST /api/recover-checkout-session` with `{ userId, expiredSessionId }`
3. Recovery API: looks up the old session, creates a new active session with the same data
4. If successful: redirects to `/checkout?sessionId=<newId>`
5. If failed: shows message "Your checkout session has expired. Redirecting..." → goes to `/add` after 3s

### Already-Used Session (`reason: 'already_used'`)
- No recovery attempted
- User shown: "This checkout session has already been completed."
- Redirected to `/add` after 3s

### Payment Succeeded but Order Creation Failed
This is the most dangerous scenario (money charged but no order in DB):
```typescript
// In handleSuccessfulPayment catch block:
setError('Payment was successful but there was an error processing your order. Please contact support.');
// Emergency redirect regardless:
window.location.href = `/thank-you?error=processing&transId=${response?.transId}`;
```

The user is still redirected to the thank-you page with an error flag and the transaction ID, so support can manually create the order.

### Square Card Errors
All Square error codes are mapped to human-readable messages in `getDeclineReason()` in `square-payment.ts`. Examples:
- `CARD_DECLINED` → "Your card was declined. Please try a different card or contact your bank."
- `INSUFFICIENT_FUNDS` → "Your card was declined due to insufficient funds. Please try a different card."
- `CVV_FAILURE` → "The CVV code entered is incorrect. Please check your card details and try again."
- `CARD_TOKEN_USED` → "This payment has already been processed. Please refresh the page for a new transaction."

---

## 17. Duplicate Order Prevention

Several mechanisms prevent a user from being charged twice or creating duplicate orders:

### 1. Processing Flag (React Ref)
```typescript
const orderProcessingFlag = useRef(false);
```
Set to `true` at the start of `handleSuccessfulPayment`. Any subsequent call to the function returns immediately if the flag is already `true`. This is a **ref**, not state, so it doesn't trigger re-renders and can't get stale in closures.

### 2. Transaction ID Tracking
```typescript
const processedTransactionIdsRef = useRef(new Set<string>());
```
Every Square transaction ID that has been processed is added to this Set. Subsequent calls with the same transaction ID are ignored. Survives re-renders because it's a ref.

### 3. Checkout Session `is_used` Flag
Once `POST /api/complete-checkout-session` is called, the session's `is_used` field is set to `true`. Any attempt to validate the same session again returns `reason: 'already_used'`.

### 4. Square Idempotency Key
Each call to `/api/square-payment` generates a fresh `uuidv4()` idempotency key. If the same key is sent twice (unlikely but possible on network retry), Square will return the same payment result instead of charging twice.

### 5. Order Number Uniqueness Constraint
`orders.order_number` has a `UNIQUE` constraint in PostgreSQL. If two concurrent requests somehow generated the same order number, the second insert would fail with a `23505` error, and the backend would retry with a new number.

---

## 18. Environment Variables Required

All variables needed for checkout to work end-to-end:

```bash
# Square (Payment Gateway)
NEXT_PUBLIC_SQUARE_APP_ID=           # Square app ID (safe to expose client-side)
NEXT_PUBLIC_SQUARE_LOCATION_ID=      # Square location ID (safe to expose client-side)
SQUARE_ACCESS_TOKEN=                  # SECRET — server-side only
SQUARE_LOCATION_ID=                   # Server-side location ID
SQUARE_ENVIRONMENT=production         # 'production' or 'sandbox'

# Supabase (Database + Auth)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # Used by create-order to bypass RLS

# Email (MailJet)
MAILJET_API_KEY=
MAILJET_SECRET_KEY=

# MailerLite (Marketing list sync)
MAILERLITE_API_KEY=
# Group IDs are configured in admin_settings table, not .env

# Airtable (Customer records)
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=

# Zapier webhook URL is stored in admin_settings table, not .env

# Site URL (used in create-order for internal API calls)
NEXT_PUBLIC_SITE_URL=https://www.fasho.co
```

---

## 19. Key Gotchas & Critical Notes

### Square SDK BigInt
Square SDK v43+ uses `BigInt` for all monetary amounts. If you `JSON.stringify()` a Square response without converting BigInt values, you get:
```
TypeError: Do not know how to serialize a BigInt
```
Always convert with `Number(paymentResult.totalMoney.amount)` before returning in API responses.

### Square SDK Constructor Changed in v43
```typescript
// Old (pre-v43) — WRONG:
const client = new Client({ accessToken: '...' })

// New (v43+) — CORRECT:
const client = new SquareClient({ token: '...' })
```

### The `pendingOrder` sessionStorage Pattern
Before Square tokenization, the entire order data is stored in `sessionStorage.pendingOrder`. This is because tokenization is async and may take a few seconds — if the React state gets stale during that time (due to re-renders), the order data could be wrong. Reading from sessionStorage in `handleSuccessfulPayment` ensures the data is always the snapshot from when the user clicked "Complete Purchase."

### Order Numbers Start at 3001
The first order in the system was #3001. The `generateOrderNumber` function finds the highest existing number and increments it. There is randomized +0–9 offset to reduce concurrent conflicts. If you delete all orders and restart, the next order will be #3001.

### Guest Checkout Creates Account BEFORE Payment in Square Flow
Unlike the Authorize.net flow (where account was created AFTER payment), the Square flow creates/authenticates the user account **before** calling `card.tokenize()`. This means `userId` is always available when the order is created.

### `musicGenre` Stored in `billing_info` JSONB
The user's music genre preference is stored inside the `billing_info` JSONB field on the `orders` table, not as a separate column. When the Marketing Manager generates playlist assignments, it reads: `(campaign.orders as any).billing_info.musicGenre`. This is the reliable source of genre for fulfillment.

### Minimum Charge: $1
FASHOkens discount is capped so the final charge is never below $1: `max(1, totalAfterCoupon - fashokensDiscount)`. This prevents charging $0.00 which would likely fail or behave unexpectedly with Square.

### Square is `SAMEORIGIN` safe
The checkout page uses Square's embedded card form (an iframe hosted by Square). The `next.config.js` has `X-Frame-Options: SAMEORIGIN` which allows Square's legitimate iframe to work.

### Don't Change the Order of Operations in `handleSuccessfulPayment`
The order matters:
1. Create order → if this fails, show error (payment charged but no order — emergency redirect)
2. Track PostHog purchase event
3. Mark session as used
4. Process FASHOkens
5. Store order in sessionStorage
6. Clean up pending order
7. Redirect to thank-you

Steps 3–6 are all non-blocking and don't gate the redirect. Only step 1 can stop the flow.

---

*This document was generated by full checkout code analysis on 2026-03-03. Update it when the payment flow changes.*
