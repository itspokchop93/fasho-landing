# FASHO.co — Complete Agent Context Document

> **For AI agents:** This document is the authoritative reference for understanding the entire Fasho platform — its architecture, data flows, every backend system, every frontend page, and every API route. Read this before making any changes. It was written by a full codebase scan on 2026-03-03.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Runtime](#2-tech-stack--runtime)
3. [Repository Structure](#3-repository-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema (Supabase / PostgreSQL)](#5-database-schema-supabase--postgresql)
6. [Authentication Systems](#6-authentication-systems)
7. [Public-Facing Pages](#7-public-facing-pages)
8. [Checkout Flow — End-to-End](#8-checkout-flow--end-to-end)
9. [User Dashboard](#9-user-dashboard)
10. [Admin Dashboard](#10-admin-dashboard)
11. [Marketing Manager System](#11-marketing-manager-system)
12. [FASHOkens Loyalty System](#12-fashokens-loyalty-system)
13. [Email System](#13-email-system)
14. [Blog System (Sanity CMS + Legacy Supabase)](#14-blog-system-sanity-cms--legacy-supabase)
15. [Coupon / Discount System](#15-coupon--discount-system)
16. [Sales Banner System](#16-sales-banner-system)
17. [Spotify Integration](#17-spotify-integration)
18. [Curator Connect+](#18-curator-connect)
19. [Power Tools (Google Sheets)](#19-power-tools-google-sheets)
20. [Analytics & Tracking](#20-analytics--tracking)
21. [Third-Party Integrations](#21-third-party-integrations)
22. [API Routes Reference](#22-api-routes-reference)
23. [Key Components](#23-key-components)
24. [Critical Rules & Known Issues](#24-critical-rules--known-issues)

---

## 1. Project Overview

**Fasho.co** is a Spotify playlist promotion SaaS for music artists, labels, and podcasters. Artists pay to have their songs pitched to a curated network of Spotify playlist curators. The platform handles:

- Spotify track search & track selection
- Package selection (tiered pricing)
- Checkout with Square payment processing
- Order management (admin fulfills orders by running marketing campaigns)
- A Marketing Manager system that auto-assigns songs to playlists and sends them to an SMM panel (Followiz) to generate streams
- A user dashboard where artists track their campaign progress
- A loyalty token system called "FASHOkens"
- A blog (Sanity CMS, with legacy Supabase fallback)
- A Curator Connect+ feature (browse and contact independent playlist curators via a Google Sheets-backed database)

---

## 2. Tech Stack & Runtime

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (Pages Router, NOT App Router) |
| Language | TypeScript 5.2 |
| Styling | TailwindCSS 3.4 |
| Database | Supabase (PostgreSQL) |
| Auth (Users) | Supabase Auth (email/password + OTP magic link) |
| Auth (Admin) | Custom JWT via `jsonwebtoken` + `bcryptjs`, stored in HttpOnly cookie `admin_session` |
| Payment | Square Web Payments SDK (primary); legacy Authorize.net code still present |
| Email | MailJet REST API (primary); Elastic Email present but secondary |
| CMS | Sanity (blog); legacy Supabase blog tables |
| SMM Panel | Followiz API v2 |
| Analytics | PostHog (reverse proxied via `/ingest/*`), Google Analytics / Google Ads via `gtag` |
| Lead Tracking | Custom `leadTracking.ts` utility |
| Marketing Automation | Zapier webhooks (`/api/send-zapier-webhook`) + MailerLite subscriber management |
| Bundler | Turbopack (Turbopack filesystem cache DISABLED — see §24) |
| Deployment | Vercel |
| Node.js (local dev) | Node 20 — always use `/opt/homebrew/opt/node@20/bin` locally |
| Package Manager | npm |

**Dev server command:** `bash ./scripts/dev-with-node20.sh` (which runs `next dev --port 3001` with Node 20).

---

## 3. Repository Structure

```
fasho-landing/
├── src/
│   ├── pages/                    # All Next.js pages (Pages Router)
│   │   ├── _app.tsx              # App wrapper (AuthProvider, PostHogInit, gtag tracking)
│   │   ├── _document.tsx         # Custom HTML document head
│   │   ├── index.tsx             # Home page (very large, ~6,500 lines)
│   │   ├── checkout.tsx          # Checkout page (~3,900 lines)
│   │   ├── checkout-sq.tsx       # Square-specific checkout variant
│   │   ├── checkout-accept.tsx   # Authorize.net accept.js checkout (legacy)
│   │   ├── thank-you.tsx         # Post-purchase thank-you page
│   │   ├── dashboard.tsx         # User dashboard (~5,800 lines)
│   │   ├── admin.tsx             # Admin dashboard (~880 lines + tab components)
│   │   ├── a-login.tsx           # Admin login page
│   │   ├── signup.tsx            # User signup / login page
│   │   ├── add.tsx               # "Add a song" landing (redirects to checkout)
│   │   ├── packages.tsx          # Package selection page
│   │   ├── pricing.tsx           # Pricing display page
│   │   ├── about.tsx             # About page
│   │   ├── contact.tsx           # Contact page
│   │   ├── blog/
│   │   │   ├── index.tsx         # Blog list
│   │   │   └── [slug].tsx        # Blog post detail
│   │   ├── auth/
│   │   │   ├── confirm.tsx       # Email confirmation handler
│   │   │   └── error.tsx         # Auth error page
│   │   ├── admin/
│   │   │   ├── order/[orderId].tsx       # Admin order detail page
│   │   │   ├── customer/[customerEmail].tsx  # Admin customer detail page
│   │   │   └── emails/edit/[trigger].tsx    # Admin email template editor
│   │   └── api/                  # All API routes (see §22)
│   ├── components/               # Shared React components (see §23)
│   ├── utils/                    # Utility modules
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser Supabase client
│   │   │   └── server.ts         # Server-side clients (createClient, createClientSSR, createAdminClient)
│   │   ├── admin/
│   │   │   └── auth.ts           # Admin JWT auth utilities
│   │   ├── authContext.tsx        # React AuthContext (user session)
│   │   ├── email/
│   │   │   ├── emailService.ts   # MailJet email service (primary)
│   │   │   └── elasticEmailService.ts  # Elastic Email (secondary)
│   │   ├── mailerlite/
│   │   │   └── mailerliteService.ts  # MailerLite subscriber sync
│   │   ├── zapier/
│   │   │   └── webhookService.ts # Zapier webhook sender
│   │   ├── followiz-api.ts       # Followiz SMM Panel API
│   │   ├── spotify-api.ts        # Spotify helpers
│   │   ├── googleSheets.ts       # Google Sheets CSV reader (Power Tools)
│   │   ├── siteSettings.ts       # Site title/description from admin_settings
│   │   ├── userProfile.ts        # UserProfileService singleton
│   │   ├── analytics.ts          # Analytics utility
│   │   ├── countryConfig.ts      # Country/phone-code config for checkout
│   │   ├── campaignProgress.ts   # Campaign progress calculation
│   │   ├── playlist-assignment-protection.ts  # Prevents duplicate playlist assignments
│   │   └── leadTracking.ts       # Lead source capture (UTM, referrer)
│   ├── types/
│   │   └── track.ts              # Track interface (Spotify track data)
│   ├── constants/
│   │   └── genres.ts             # MUSIC_GENRES list
│   ├── hooks/
│   │   ├── useCountdown.ts       # Countdown timer hook
│   │   ├── useExchangeRates.ts   # Currency conversion hook
│   │   └── use-page-visibility.ts
│   ├── lib/
│   │   └── sanity/               # Sanity CMS client + queries + types
│   └── styles/
│       └── globals.css
├── plugins/
│   └── blog/                     # Blog plugin (Supabase-backed legacy blog)
│       ├── components/           # Blog admin components (BlogDashboard, BlogEditor, etc.)
│       ├── types/blog.ts
│       └── utils/                # Supabase client, slug gen, read time, etc.
├── sanity-studio/                # Standalone Sanity Studio (for CMS editing)
├── public/                       # Static assets
│   ├── iframe-communicator.html  # Used in checkout iframe payment communication
│   ├── iframe-communicator-local.html
│   └── product-images/, logos/, signup-pics/, fasho_ico/
├── next.config.js                # Next.js config (Turbopack, image domains, headers, redirects)
├── package.json
├── tsconfig.json
├── postcss.config.js
├── vercel.json
└── DATABASE_SCHEMA.md            # SQL for core tables
```

---

## 4. Environment Variables

All secrets live in `.env.local`. Never commit this file. Key variables:

### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon key (browser-safe)
SUPABASE_SERVICE_ROLE_KEY=         # Service role key (server-side only, bypasses RLS)
```

### Admin Auth
```
ADMIN_EMAIL=                       # Super admin email
ADMIN_PASSWORD_HASH=               # bcrypt hash — MUST escape $ signs in dotenv: \$2b\$12\$...
JWT_SECRET=                        # Secret for signing admin JWT tokens

# Sub-admins (up to 5)
SUBADMIN_SUBADMIN1_EMAIL=
SUBADMIN_SUBADMIN1_PASSWORD_HASH=
SUBADMIN_SUBADMIN2_EMAIL=
SUBADMIN_SUBADMIN2_PASSWORD_HASH=
# ... up to SUBADMIN5
```

> **CRITICAL:** bcrypt hashes in `.env.local` MUST have `$` signs escaped as `\$`. Unescaped `$` causes dotenv to interpret them as variable interpolation, silently corrupting the hash, causing login failures. See §24.

### Square (Payment)
```
SQUARE_ACCESS_TOKEN=               # Square API token
SQUARE_LOCATION_ID=                # Square location ID
SQUARE_ENVIRONMENT=                # 'production' or 'sandbox'
```

### Authorize.net (Legacy — still in codebase)
```
AUTHORIZE_NET_API_LOGIN_ID=
AUTHORIZE_NET_TRANSACTION_KEY=
AUTHORIZE_NET_ENVIRONMENT=         # Must be 'production'
```

### Spotify
```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

### MailJet (Email)
```
MAILJET_API_KEY=
MAILJET_SECRET_KEY=
```

### MailerLite (Email marketing)
```
MAILERLITE_API_KEY=
```

### Followiz (SMM Panel)
```
FOLLOWIZ_API_KEY=
FOLLOWIZ_API_URL=                  # Default: https://followiz.com/api/v2
```

### Google (Sheets + Service Account)
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
```

### Zapier
```
ZAPIER_WEBHOOK_URL=                # Stored in admin_settings table, not .env
```

### Sanity CMS
```
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=        # 'production'
SANITY_API_VERSION=                # e.g. '2024-01-01'
NEXT_PUBLIC_SANITY_STUDIO_URL=
SANITY_READ_TOKEN=                 # Server-side only (for preview/draft mode)
```

### PostHog
```
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=          # Reverse proxied via /ingest/*
```

### Google Analytics / Ads
```
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

---

## 5. Database Schema (Supabase / PostgreSQL)

### Core Tables

#### `orders`
Primary order record created at checkout completion.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Auto-generated |
| order_number | VARCHAR(50) UNIQUE | Format: `FASHO-XXXX` (sequential) |
| user_id | UUID → auth.users | May be null for guest checkout |
| customer_email | VARCHAR(255) | |
| customer_name | VARCHAR(255) | |
| subtotal | DECIMAL(10,2) | Before discounts |
| discount | DECIMAL(10,2) | Coupon or token discount |
| total | DECIMAL(10,2) | Charged amount |
| status | VARCHAR(50) | `processing`, `marketing_campaign_running`, `completed`, `cancelled`, `order_issue` |
| payment_status | VARCHAR(50) | `paid` |
| billing_info | JSONB | Full billing address + `musicGenre` field |
| payment_data | JSONB | Square/Authorize.net transaction data |
| admin_notes | TEXT | Admin-editable notes |
| first_viewed_at | TIMESTAMPTZ | When admin first opened order detail |
| viewed_by_admin | VARCHAR | Admin email who first viewed |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

#### `order_items`
One row per track/package pair in an order.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| order_id | UUID → orders.id CASCADE | |
| track_id | VARCHAR | Spotify track ID |
| track_title | VARCHAR | |
| track_artist | VARCHAR | |
| track_image_url | TEXT | Spotify album art URL |
| track_url | TEXT | Spotify track URL |
| package_id | VARCHAR(50) | `breakthrough`, `momentum`, `dominate`, `unstoppable`, `legendary`, `test` |
| package_name | VARCHAR(100) | Display name |
| package_price | DECIMAL(10,2) | |
| package_plays | VARCHAR(50) | Stream range string |
| package_placements | VARCHAR(50) | Playlist pitch count string |
| package_description | TEXT | |
| original_price | DECIMAL(10,2) | List price |
| discounted_price | DECIMAL(10,2) | After coupon/token discount |
| is_discounted | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `add_on_items`
Optional add-on purchases per order.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| order_id | UUID → orders.id CASCADE | |
| addon_id | VARCHAR(50) | `express-launch`, `discover-weekly-push` |
| addon_name | VARCHAR(255) | |
| addon_description | TEXT | |
| original_price | INTEGER | In cents |
| discounted_price | INTEGER | In cents |
| is_discounted | BOOLEAN | |
| emoji | VARCHAR(10) | |

#### `checkout_sessions`
Temporary session store for the checkout flow.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Session ID passed via URL |
| session_data | JSONB | `{tracks, selectedPackages, userId}` |
| status | VARCHAR | `active`, `expired`, `used`, `invalidated` |
| is_used | BOOLEAN | Prevents replay attacks |
| created_at | TIMESTAMPTZ | Expires after 24h |
| updated_at | TIMESTAMPTZ | |

#### `marketing_campaigns`
One row per order_item; tracks fulfillment state.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| order_id | UUID → orders.id | |
| order_number | VARCHAR | Denormalized |
| song_name | VARCHAR | |
| song_link | TEXT | Spotify URL |
| track_id | VARCHAR | Spotify track ID |
| artist_name | VARCHAR | |
| customer_name | VARCHAR | |
| package_name | VARCHAR | |
| package_id | VARCHAR | |
| playlist_assignments | JSONB | Array of assigned playlist objects |
| smm_submission_results | JSONB | Results from Followiz |
| stream_values | JSONB | Min/max stream targets |
| status | VARCHAR | Campaign status |
| created_at | TIMESTAMPTZ | |

#### `playlist_network`
Admin-managed list of Spotify playlists used for campaign fulfillment.

| Column | Notes |
|---|---|
| id | UUID PK |
| playlist_name | |
| genre | Comma-separated genres |
| account_email | Account that owns the playlist |
| playlist_link | Spotify URL |
| spotify_playlist_id | |
| max_songs | Max simultaneous songs |
| is_active | Toggle on/off |

#### `campaign_totals`
Maps package names to their fulfillment targets.

| Column | Notes |
|---|---|
| package_name | `BREAKTHROUGH`, `MOMENTUM`, etc. |
| playlist_assignments_needed | How many playlists to assign |
| min_streams | Target min streams |
| max_streams | Target max streams |

#### `smm_order_sets`
Maps package names to Followiz service IDs and quantities.

| Column | Notes |
|---|---|
| package_name | |
| service_id | Followiz service ID |
| quantity | Streams to order |
| drip_runs | Optional drip feed runs |
| interval_minutes | Optional drip feed interval |
| is_active | |

#### `coupon_codes`
Discount codes for checkout.

| Column | Notes |
|---|---|
| id | UUID PK |
| code | Unique coupon string |
| name | Admin display name |
| discount_type | `percentage` or `flat` |
| discount_value | Percent or dollar amount |
| min_order_amount | Minimum order to apply |
| max_discount_amount | Optional cap |
| usage_limit | Optional max uses |
| current_usage | Running count |
| is_active | |
| starts_at | |
| expires_at | Optional |

Coupon validation uses a PostgreSQL function `validate_coupon_code(input_code, order_amount)`.

#### `admin_settings`
Key-value store for admin-configurable site settings.

Common keys:
- `site_title`, `site_description` — SEO meta
- `sales_banner_desktop_before_text`, `sales_banner_desktop_after_text`, `sales_banner_desktop_coupon_code`
- `sales_banner_mobile_before_text`, `sales_banner_mobile_after_text`, `sales_banner_mobile_coupon_code`
- `zapier_webhook_url` — Zapier webhook URL
- `mailerlite_checkout_group_id`, `mailerlite_signup_group_id` — MailerLite group IDs
- `fashokens_*` — FASHOkens settings (also have their own `loyalty_settings` table)

#### `email_templates`
HTML email templates managed from the admin dashboard.

| Column | Notes |
|---|---|
| id | UUID PK |
| name | Human display name |
| trigger_type | `order_placed`, `order_status_processing`, `order_status_marketing_campaign`, `order_status_completed`, `order_status_order_issue`, `order_status_cancelled` |
| subject | Email subject (supports `{{variable}}` placeholders) |
| html_content | Full HTML (supports `{{variable}}` placeholders) |
| is_active | Whether this trigger fires |

#### `loyalty_accounts`
FASHOkens balance per user.

| Column | Notes |
|---|---|
| user_id | UUID → auth.users |
| balance | Current token balance |
| lifetime_earned | Cumulative earned |
| lifetime_spent | Cumulative spent |

#### `loyalty_ledger`
FASHOkens transaction history.

| Column | Notes |
|---|---|
| user_id | |
| type | `earn`, `spend`, `admin_adjust` |
| amount | Token amount |
| reason | Description |
| order_id | Optional FK to orders |
| balance_before | |
| balance_after | |

#### `loyalty_settings`
Global FASHOkens program config (single row, id=1).

| Column | Notes |
|---|---|
| tokens_per_dollar | Tokens earned per $1 spent (default: 100) |
| redemption_tokens_per_dollar | Tokens needed per $1 discount (default: 1000) |
| is_program_active | |
| minimum_order_total | Minimum order to earn tokens |

#### `curator_contacts`
Tracks which Curator Connect curators a user has contacted.

| Column | Notes |
|---|---|
| user_id | UUID → auth.users |
| curator_id | Integer ID from Google Sheet row |
| contacted_at | |
| contact_count | |

#### `email_settings`
Per-trigger email notification toggles (separate from `email_templates`).

#### `admin_users`
Used internally for FASHOkens admin audit trail. Email and ID stored here for display purposes.

> **Note:** Actual admin authentication does NOT use this table — it uses environment variables. This table is only used to look up `updated_by_email` in FASHOkens settings display.

---

## 6. Authentication Systems

### User Auth (Supabase)
- Uses Supabase Auth (email/password + magic link OTP)
- Managed via `src/utils/supabase/client.ts` (browser) and `src/utils/supabase/server.ts` (server/API)
- `AuthProvider` in `_app.tsx` wraps entire app; exposes `useAuth()` hook → `{ user, loading, refreshUser }`
- Auth state is checked on `dashboard.tsx` via `getServerSideProps` using `createClientSSR`; unauthenticated users are redirected to `/signup`
- User signup flow: `/signup` → Supabase → email confirmation → `/auth/confirm` → dashboard
- Password reset: Supabase sends reset email; user is redirected back to complete the flow
- OTP login: User enters email → Supabase sends magic link → auto-login

### Admin Auth (Custom JWT)
- Login page: `/a-login` (publicly accessible)
- Submit form → `POST /api/admin/auth/login`
- Server validates credentials against env vars via `validateAdminCredentials()` in `src/utils/admin/auth.ts`
- **Super admin:** `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` → role `admin` (full access)
- **Sub-admins:** Up to 5, configured via `SUBADMIN_SUBADMINX_EMAIL` + `SUBADMIN_SUBADMINX_PASSWORD_HASH` → role `sub_admin` (limited to orders tab + marketing manager only)
- On success: JWT signed with `JWT_SECRET` (24h expiry) is set as HttpOnly cookie `admin_session`
- All admin API routes use `requireAdminAuth(handler)` wrapper which reads cookie, verifies JWT
- Rate limiting: 5 attempts per 15 min per email address (in-memory Map, resets on server restart)
- Admin page (`/admin`) uses `getServerSideProps` to call `verifyAdminToken` → renders `AdminAccessDenied` component if invalid

---

## 7. Public-Facing Pages

### `/` — Home Page (`index.tsx`)
Extremely large file (~6,500 lines). Contains:
- Hero section with animated particle background (`HeroParticles`)
- Spotify track search bar (calls `POST /api/spotify/search`)
- Live counter showing active artists (`LiveCounter` component)
- Package display cards (`PackageCard`)
- Artist Insights Card (`ArtistInsightsCard`) — shows Spotify artist stats after track selection
- Authenticity guarantee section
- Testimonials with real artist names/photos
- Record label logos carousel
- FASHOkens intro section
- "SalesPop" social proof notifications
- `SalesBanner` (top bar with coupon code, configurable from admin)
- Animates on scroll using AOS (CSS-based) + HTML/CSS keyframes
- Fetches site settings from `/api/site-settings` on load
- Tracks GTM/GA4 events via `gtag`

### `/packages` — Package Selection
Step 1 of the checkout flow. Shows all packages with pricing and feature comparison.

### `/checkout` — Checkout Page (`checkout.tsx`)
Full checkout experience. See §8 for detailed flow.

### `/thank-you` — Post-Purchase Page
- Displays order summary with track art, package details, add-ons
- Triggers Google Ads conversion event via `gtag`
- Triggers PostHog `purchase` event
- Shows `IntakeFormModal` if user hasn't completed intake form

### `/dashboard` — User Dashboard
Authenticated only. See §9.

### `/signup` — Signup / Login
- Toggle between signup and login
- Email availability check on blur
- Password strength requirements display
- OTP login option
- Password reset via email
- After signup: triggers Zapier webhook (`user_signup` event), syncs to MailerLite

### `/blog` and `/blog/[slug]`
See §14.

### `/about`, `/contact`, `/pricing`
Static informational pages.

### `/authenticity-guarantee`, `/refund-policy`, `/privacy`, `/terms`, `/disclaimer`
Legal/policy pages.

### `/404`
Custom 404 page.

---

## 8. Checkout Flow — End-to-End

### Step 1: Track Selection (Home Page `/`)
1. User searches for their Spotify track using the search bar
2. Frontend calls `POST /api/spotify/search` with `{ query }` → returns array of `Track` objects
3. User clicks a track → track is stored in component state
4. "Package Selection" button appears → navigates to `/packages`

### Step 2: Package Selection (`/packages`)
1. Shows 6 packages: `test` ($0.10), `breakthrough` ($39), `momentum` ($79), `dominate` ($149), `unstoppable` ($259), `legendary` ($479)
2. User selects a package → navigates to `/checkout` with URL params: `?tracks=[...]&selectedPackages=[...]`
3. A `checkout_session` is created in Supabase at this point via `POST /api/create-checkout-session`

### Step 3: Checkout Page (`/checkout`)
**State on load:**
- Reads `tracks` and `selectedPackages` from URL query params
- Decodes and sets order items
- Validates the checkout session via `POST /api/validate-checkout-session`
- If user is logged in (via `useAuth`), pre-fills billing fields from their profile
- Fetches FASHOkens balance to show available discount tokens

**Checkout form sections (displayed as steps):**
1. **Order Review** — shows track card(s), package(s), prices; allows coupon code entry
2. **Add-ons** — optional upgrades: "EXPRESS: 8hr Rapid Launch" ($14 sale/$28 original), "Discover Weekly Push" ($19/$38)
3. **FASHOkens** — toggle to spend loyalty tokens for discount (if user has balance)
4. **Billing Info** — firstName, lastName, email, address, city, state, zip, country, phone, music genre selection
5. **Payment** — Square Web Payments SDK card form embedded in page

**Coupon Validation:**
- User enters code → `POST /api/validate-coupon` with `{ coupon_code, order_amount }`
- Calls Supabase RPC `validate_coupon_code()` → returns discount amount
- Applied discount shown in order summary

**FASHOkens Redemption:**
- User toggles "Use FASHOkens" → frontend calculates discount (1000 tokens = $1)
- Tokens are actually deducted AFTER successful payment in the order creation step

**Payment Submission:**
1. User clicks "Complete Purchase"
2. Frontend tokenizes card via Square Web Payments SDK → gets `sourceId`
3. Frontend calls `POST /api/square-payment` with `{ sourceId, amount, orderItems, customerEmail, billingInfo }`
4. Server creates Square payment via Square SDK → returns `{ success: true, payment: {...} }`
5. On payment success, frontend calls `POST /api/create-order` (or similar order creation endpoint) which:
   - Creates `orders` record in Supabase
   - Creates `order_items` records
   - Creates `add_on_items` records
   - Marks checkout session as used (`is_used: true`)
   - Awards FASHOkens (calls `admin_adjust_fashokens` RPC if tokens were earned)
   - Sends order confirmation email via `emailService.sendNotification('order_placed', ...)`
   - Sends Zapier webhook (`checkout_success` event)
   - Syncs customer to MailerLite checkout group
6. On success, navigate to `/thank-you` with order data in query params / sessionStorage

**Error Handling:**
- Card decline → user-friendly message mapped from Square error codes
- Session expired → auto-recovery attempted via `POST /api/recover-checkout-session`
- If recovery fails, user redirected to restart flow

### Post-Checkout
- `/thank-you` renders order summary
- Fires Google Ads conversion tracking
- If user didn't have an account, prompts to create one (account was auto-created with temp password)
- Shows `IntakeFormModal` if first time (collects artist goals/info)

---

## 9. User Dashboard

**Route:** `/dashboard`  
**Auth:** `getServerSideProps` checks Supabase session; redirects to `/signup` if unauthenticated.

### Dashboard Tabs
The dashboard has multiple tabs accessible via sidebar (desktop) or dropdown (mobile):

#### "Dashboard" Tab (default)
- Welcome header with user name
- FASHOkens balance card (current balance, lifetime earned, lifetime spent)
- Campaign cards for each order — shows track art, package name, progress bar
- "Campaign Progress" calculated via `src/utils/campaignProgress.ts`
- Animated stats boxes
- Lottie animation (loaded from Lottie host URL)
- "Add Another Song" CTA button → links to `/`

#### "My Orders" Tab
- Fetches orders from Supabase filtered by `user_id`
- Expandable order cards showing: order number, date, status badge, track info, package
- Status badges: `processing` (yellow), `marketing_campaign_running` (blue), `completed` (green), `order_issue` (red), `cancelled` (gray)
- Each order shows `CampaignProgressBar` component

#### "FASHOkens" Tab
- Shows balance, lifetime earned, lifetime spent
- Paginated ledger table showing all token transactions
- Calls `GET /api/user/fashokens?userId=...&page=...`

#### "Curator Connect+" Tab
- Fetches curator data from Google Sheets via `GET /api/curator-connect`
- Excel-style table with: playlist image, name, genre bubbles, follower count, contact button
- Filtering: search by name, genre multi-select, follower range, status (contacted/not)
- Sorting by followers or name
- "Contact" button opens `mailto:` with pre-filled subject (email is never shown to user)
- Tracks contact history in Supabase `curator_contacts` table

#### "Power Tools" Tab
- Fetches affiliate tool recommendations from Google Sheets (public CSV)
- Grid of tool cards: image, title, description, star rating, affiliate link
- Filterable by category

#### "Settings" Tab
- Update display name and profile info
- Artist profile setup: search Spotify for your artist, set profile image from Spotify artist photo
- Email change (checks if new email is available)
- Password reset trigger

#### "Contact" Tab
- Support form that submits to Freshdesk (or email fallback)
- Pre-fills user's email

#### "Intake Form"
- Triggered automatically for users who haven't completed it
- Modal form collecting artist goals, social links, genre info
- Submitted via Zapier webhook (`intake_form_dashboard` event)

#### Dashboard Tour
- Guided intro.js tour using `DashboardTour` component
- User can manually trigger from settings or a "?" button

---

## 10. Admin Dashboard

**Route:** `/admin`  
**Auth:** Custom JWT in `admin_session` cookie. `getServerSideProps` verifies token. Renders `AdminAccessDenied` for invalid sessions.

**Navigation:** URL query param `?p=<tab>` controls which tab renders. Tabs:
- `?p=dashboard` — Analytics overview
- `?p=orders` — Orders management
- `?p=emails` — Email template management
- `?p=coupons` — Coupon codes
- `?p=settings` — Site settings
- `?p=blog` — Blog management
- `?p=marketing-manager` — Marketing Manager
- `?p=fashokens` — FASHOkens management

**Sub-admin restrictions:** `sub_admin` role can ONLY access `orders` and `marketing-manager` tabs. Other tabs are blocked and redirect to orders.

### Dashboard Tab (`?p=dashboard`)
- Animated counter cards: Total Orders, Total Revenue, Monthly Orders, Monthly Revenue
- Data from `GET /api/admin/analytics`
- Monthly orders bar chart (`MonthlyOrdersChart` using Chart.js, dynamically imported)

### Orders Tab (`?p=orders`) — `AdminOrdersWithSubTabs`
Sub-tabs via the same `?p=` param:
- `orders-management` — full order list with search, status filter, sorting, pagination
  - Each order: order number, customer, date, status, total, view button
  - Status update dropdown per order
  - Quick notes field
  - "View Full Details" → `/admin/order/[orderId]`
- `orders-customers` — customer aggregation view (by email)
  - Columns: customer name, email, date joined, last order, purchase count, total spend

**Order Detail Page (`/admin/order/[orderId]`):**
- Full order info: billing, payment data, track details
- Edit status → triggers automatic email notification to customer
- Edit admin notes
- Edit track URL (in case Spotify URL changes)
- Edit package selection (change which package was ordered)
- Generate playlist assignments button → calls `POST /api/marketing-manager/generate-playlist-assignments`
- Submit SMM purchase button → calls `POST /api/marketing-manager/smm-panel/submit-purchase`
- View campaign progress and playlist assignment list

**Customer Detail Page (`/admin/customer/[customerEmail]`):**
- All orders for this customer
- Total spend, order count, date joined
- Playlist placement history

### Emails Tab (`?p=emails`) — `AdminEmailManagement`
- Lists all email templates from `email_templates` table
- Toggle is_active per template
- "Edit" → navigates to `/admin/emails/edit/[trigger]`
- Test email sending

**Email Template Editor (`/admin/emails/edit/[trigger]`):**
- Rich HTML editor for email subject and body
- Preview mode
- Variable reference panel showing available `{{variables}}`
- Save template via `PUT /api/admin/email-templates`

### Coupons Tab (`?p=coupons`) — `AdminCouponsManagement`
- Create/edit/delete coupon codes
- Fields: code, name, type (percentage/flat), value, min order, max discount, usage limit, active dates
- View usage counts
- CRUD via `GET/POST/PUT/DELETE /api/admin/coupons`

### Settings Tab (`?p=settings`) — `AdminSettingsManagement`
- Site title, site description
- Sales banner text (desktop + mobile) and coupon code
- Zapier webhook URL
- MailerLite group IDs (checkout group, signup group)
- Saved via `PUT /api/admin/admin-settings`

### Blog Tab (`?p=blog`) — `BlogDashboard`
- Create/edit/delete blog posts (stored in Supabase `blog_posts` table — legacy)
- Note: New blog content is managed via Sanity Studio (`/sanity-studio`)
- Analytics panel showing post views

### Marketing Manager Tab (`?p=marketing-manager`) — `MarketingManager`
See §11.

### FASHOkens Tab (`?p=fashokens`) — `AdminFashokensManagement`
See §12.

### MailerLite Tab
- Accessible from Settings tab area
- View MailerLite groups and subscriber counts
- Sync settings for which groups receive which events
- Test push subscriber to MailerLite

---

## 11. Marketing Manager System

The Marketing Manager is how admin fulfills orders. It's the core operational backend of the business.

**Access:** `/admin?p=marketing-manager`  
**Component:** `src/components/MarketingManager.tsx`

### Sub-tabs within Marketing Manager:

#### "Counter Cards"
- Dashboard cards showing:
  - Total active campaigns
  - Campaigns pending playlist assignment
  - Campaigns with SMM submitted
  - Campaigns completed
- Data from `GET /api/marketing-manager/counter-data`

#### "Action Queue"
- List of campaigns requiring action from the admin
- Each item shows: order number, artist, song, package, what action is needed
- Actions: "Generate Playlists", "Submit to SMM Panel", "Mark Complete"
- Items can be hidden/unhidden via `POST /api/marketing-manager/hide-action-item` and `/unhide-action-item`
- Calls `GET /api/marketing-manager/action-items`

#### "Active Campaigns"
- All currently active campaigns
- Shows playlist assignment status for each
- Admin can re-generate playlists or update genre

#### "Playlist Utilization"
- Shows how many songs are currently placed in each playlist vs. capacity
- Helps admin see which playlists are full
- Data from `GET /api/marketing-manager/playlist-utilization`

#### "System Settings"
Sub-tabs:
- **Playlists** — CRUD for `playlist_network` table
  - Add, edit, toggle active/inactive playlists
  - Fields: name, genre, account email, Spotify link, max songs
- **Campaign Totals** — Configure playlist target counts per package
  - `BREAKTHROUGH`: e.g. 10-12 playlists
  - `MOMENTUM`: 25-30 playlists
  - etc.
- **Stream Purchases (SMM)** — Configure `smm_order_sets` table
  - Map packages to Followiz service IDs and quantities
  - Drip feed settings (runs + interval_minutes)
- **Purchase API Settings** — Configure Followiz API key and check balance

### Fulfillment Flow (How an Order Gets Fulfilled)

1. **Order arrives** → `marketing_campaigns` row is auto-created when order is placed
2. **Admin opens Marketing Manager** → sees order in Action Queue
3. **Generate Playlist Assignments:**
   - Admin clicks "Generate Playlists" for a campaign
   - Calls `POST /api/marketing-manager/generate-playlist-assignments` with `{ campaignId }`
   - Server reads campaign's `package_name` → looks up `campaign_totals.playlist_assignments_needed`
   - Reads user's `musicGenre` from `billing_info` JSONB
   - Queries `playlist_network` for active playlists matching genre
   - Uses `playlist-assignment-protection.ts` to avoid assigning same playlist to same track twice (checks `track_id` across existing assignments)
   - Stores assignment array in `marketing_campaigns.playlist_assignments`
4. **Submit to SMM Panel:**
   - Admin clicks "Submit Purchase" for a campaign
   - Calls `POST /api/marketing-manager/smm-panel/submit-purchase` with `{ campaignId }`
   - Server fetches `smm_order_sets` for the package
   - Calls `submitFollowizOrder()` for each order set via `followiz-api.ts`
   - Followiz API call: `POST https://followiz.com/api/v2` with `key`, `action=add`, `service`, `link` (Spotify URL), `quantity`
   - Results stored in `marketing_campaigns.smm_submission_results`
5. **Campaign Runs** → Followiz delivers streams over time
6. **Admin marks order complete** → updates `orders.status` to `completed` → triggers completion email

### Key API Routes for Marketing Manager:
```
GET  /api/marketing-manager/action-items
GET  /api/marketing-manager/counter-data
GET  /api/marketing-manager/current-placements
GET  /api/marketing-manager/playlists
GET  /api/marketing-manager/playlist-utilization
POST /api/marketing-manager/generate-playlist-assignments
POST /api/marketing-manager/update-playlist-assignment
POST /api/marketing-manager/update-genre
POST /api/marketing-manager/hide-action-item
POST /api/marketing-manager/unhide-action-item
POST /api/marketing-manager/confirm-action
POST /api/marketing-manager/force-import-orders
POST /api/marketing-manager/populate-existing-orders
POST /api/marketing-manager/reset-all-assignments
POST /api/marketing-manager/fix-campaign-stream-values
GET  /api/marketing-manager/song-placement-history
GET  /api/marketing-manager/customer-order-history
GET  /api/marketing-manager/smm-panel/balance
GET  /api/marketing-manager/smm-panel/order-sets
GET  /api/marketing-manager/smm-panel/playlist-services
GET  /api/marketing-manager/smm-panel/service-prices
GET  /api/marketing-manager/smm-panel/submission-status
POST /api/marketing-manager/smm-panel/submit-purchase
POST /api/marketing-manager/smm-panel/submit-playlist-purchase
GET  /api/marketing-manager/system-settings/playlists
POST /api/marketing-manager/system-settings/add-playlist
DELETE /api/marketing-manager/system-settings/delete-playlist
POST /api/marketing-manager/system-settings/toggle-playlist-status
GET  /api/marketing-manager/system-settings/campaign-totals
POST /api/marketing-manager/system-settings/update-campaign-total
GET  /api/marketing-manager/system-settings/stream-purchases
GET  /api/marketing-manager/system-settings/playlist-usage-count
```

---

## 12. FASHOkens Loyalty System

FASHOkens is a points/loyalty token system. Customers earn tokens on every purchase and can redeem them for discounts on future orders.

**Default rates:**
- Earn: 100 tokens per $1 spent
- Redeem: 1,000 tokens per $1 discount

**Database tables:** `loyalty_accounts`, `loyalty_ledger`, `loyalty_settings`

### Earning Tokens
- Earned automatically after a successful payment
- `admin_adjust_fashokens(p_admin_id, p_user_id, p_amount, p_is_addition, p_reason)` PostgreSQL RPC function handles the ledger entry and updates balance atomically

### Spending Tokens
- In checkout, users toggle "Use FASHOkens"
- Frontend calculates discount from available balance
- On order completion, tokens are deducted via `admin_adjust_fashokens` with `p_is_addition = false`

### Admin FASHOkens Management (`?p=fashokens`)
Three sub-tabs:
1. **Customers** — list all users with loyalty accounts, their balances, lifetime stats
   - Search by name/email
   - Click user → view their ledger
2. **Ledger** — global ledger of all token transactions
3. **Settings** — adjust global program settings (earn rate, redemption rate, on/off toggle)

Key API routes:
```
GET  /api/admin/fashokens/customers
GET  /api/admin/fashokens/customer-balance?userId=...
GET  /api/admin/fashokens/ledger
POST /api/admin/fashokens/adjust    { userId, amount, isAddition, reason }
POST /api/admin/fashokens/bulk-credit
GET  /api/admin/fashokens/settings
PUT  /api/admin/fashokens/settings
GET  /api/user/fashokens?userId=...&page=...
```

---

## 13. Email System

### Primary: MailJet
- Uses MailJet REST API v3.1 directly (not their SDK)
- Credentials: `MAILJET_API_KEY` + `MAILJET_SECRET_KEY`
- Implementation: `src/utils/email/emailService.ts` — `EmailService` class

**How it works:**
1. Event triggers an email (e.g., order status change by admin)
2. `emailService.sendNotification(triggerType, emailData, supabaseClient)` is called
3. Fetches the matching template from `email_templates` table by `trigger_type`
4. Checks `email_settings` to confirm notification is active
5. Replaces `{{variable}}` placeholders in subject and HTML body
6. Calls `sendMailJetEmail(to, subject, htmlContent)` → `POST https://api.mailjet.com/v3.1/send`
7. Updates email send statistics in database

**Available triggers:**
- `order_placed` — sent on new order
- `order_status_processing` — admin sets status to "processing"
- `order_status_marketing_campaign` — admin sets to "marketing campaign running"
- `order_status_completed` — admin sets to "completed"
- `order_status_order_issue` — admin sets to "order issue"
- `order_status_cancelled` — admin sets to "cancelled"

**Template variables:** `{{customerName}}`, `{{orderNumber}}`, `{{orderTotal}}`, `{{orderDate}}`, etc.

### MailerLite (Marketing Email Lists)
- Used for email newsletter/marketing lists
- Implementation: `src/utils/mailerlite/mailerliteService.ts`
- Subscribers are synced via `upsertSubscriber()` on:
  - Checkout success → added to checkout group
  - User signup → added to signup group
- Group IDs configured in `admin_settings`
- Admin can view groups and test push from `?p=mailerlite` section

---

## 14. Blog System (Sanity CMS + Legacy Supabase)

### Sanity CMS (Primary)
- `NEXT_PUBLIC_SANITY_PROJECT_ID` must be set for Sanity to be active
- Client in `src/lib/sanity/client.ts`
- Queries in `src/lib/sanity/queries.ts` (GROQ queries)
- `isSanityConfigured()` checks if project ID is set before making requests
- Blog pages: `getPublishedPosts()`, `getFeaturedPosts()` from Sanity
- Images via `urlFor()` builder using `@sanity/image-url`
- Sanity Studio lives at `/sanity-studio/` (separate Vite app, deployed separately or locally)

### Legacy Supabase Blog (Fallback)
- Supabase blog tables queried via `plugins/blog/utils/supabase.ts`
- Falls back to Supabase if Sanity returns no results or isn't configured

### Blog Pages
- `/blog` — list page with featured carousel + post grid
  - Merges Sanity + Supabase posts via `mergePostLists()`
  - Pagination, search, tag/category filter
- `/blog/[slug]` — post detail
  - Renders Sanity portable text via `PortableTextRenderer`
  - Falls back to Supabase HTML content
  - SEO: structured data (schema.org), Open Graph tags

### Sanity Studio Integration
- Located at `sanity-studio/` directory
- Must be run separately (`cd sanity-studio && npm run dev`)
- Publishes content with custom `publishWithDate` action
- Webhook at `POST /api/sanity/revalidate` triggers ISR revalidation

### Blog Admin (in Admin Dashboard `?p=blog`)
- Uses legacy Supabase blog tables
- Create/edit posts via TipTap rich text editor
- SEO sidebar for meta title/description/keywords
- Post list with analytics (view counts)

---

## 15. Coupon / Discount System

- Coupons stored in `coupon_codes` table
- Two types: `percentage` (e.g., 15% off) and `flat` (e.g., $20 off)
- Support for min order, max discount, usage limits, date ranges

**Validation flow:**
1. User enters code in checkout
2. Frontend calls `POST /api/validate-coupon` with `{ coupon_code, order_amount }`
3. API calls Supabase RPC `validate_coupon_code()` — handles all business rules atomically
4. Returns `{ valid, coupon_id, discount_type, discount_value, calculated_discount }`
5. Frontend applies discount to order total display

**Usage tracking:**
- `current_usage` is incremented on successful order, NOT on validation
- Usage is incremented in the order creation step

**Admin management:** Full CRUD at `?p=coupons` tab.

---

## 16. Sales Banner System

A configurable top-of-page banner shown on the home page and checkout.

- Component: `src/components/SalesBanner.tsx` (wrapper)
  - `SalesBannerDesktop.tsx`
  - `SalesBannerMobile.tsx`
- Settings fetched from `GET /api/sales-banner-settings`
- Settings stored in `admin_settings` table with keys prefixed `sales_banner_*`
- Supports `{month}` placeholder (auto-replaced with current month name)
- Admin edits text and coupon code in the Settings tab

---

## 17. Spotify Integration

All Spotify calls go through server-side API routes (credentials never exposed client-side).

**Authentication:** Client Credentials flow (not OAuth). Tokens are fetched per-request (no caching currently).

**Routes:**
- `POST /api/spotify/search` — search tracks by query string
- `GET /api/spotify/artist` — fetch artist details by artist ID
- `GET /api/spotify/artist-search` — search for artists (used in dashboard artist profile setup)
- `POST /api/admin/validate-spotify-url` — validate a Spotify URL format

**Track interface (`src/types/track.ts`):**
```typescript
interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  imageUrl: string;
  url: string;
  artistProfileUrl?: string;
  duration?: number;
  popularity?: number;
  previewUrl?: string;
}
```

---

## 18. Curator Connect+

A feature inside the user dashboard (`/dashboard`) that lets users browse Spotify playlist curators and contact them directly.

**Data source:** Google Sheets (public data with service account access)
- Spreadsheet structure: Playlist Image URL | Playlist Name | Playlist URL | Genre | Saves/Followers | Contact Email

**API:**
- `GET /api/curator-connect` — fetches curator list from Google Sheets, removes email from response
- `POST /api/curator-contact-track` — records contact in `curator_contacts` table
- `GET /api/curator-contacts` — returns which curator IDs the current user has contacted

**Contact flow:**
1. User clicks "Contact" button on curator row
2. Opens `mailto:` link with pre-filled subject (email comes from Sheet but is never displayed)
3. Simultaneously calls `POST /api/curator-contact-track` to log in database
4. Row visually updates to show "Contacted" checkmark

**Filtering/Sorting:**
- Search by playlist name
- Multi-genre filter
- Min/max followers (saves count)
- Status filter: all | contacted | not contacted
- Sort: followers ascending/descending, name alphabetical

---

## 19. Power Tools (Google Sheets)

A curated list of software/tools for musicians, shown in the user dashboard "Power Tools" tab.

**Data source:** Public Google Sheet CSV  
**Sheet ID:** `13-A9D32we7Ij3WJjzVBMFvGeue02I_0ia5UuTdqaTcM`

**Columns:** Product Name | Image | Description | Affiliate Link | Stars | Category | Featured | Weight

**Implementation:** `GoogleSheetsService.fetchPowerTools()` in `src/utils/googleSheets.ts` — fetches CSV, parses it, returns `PowerTool[]`.

**Dashboard components:**
- `PowerToolsCarousel` — horizontal scroll carousel of featured tools
- `PowerToolsTab` — full grid with category filter
- `PowerToolCard` — individual card with image, title, stars, affiliate link

---

## 20. Analytics & Tracking

### Google Analytics / Google Ads
- Implemented via `src/utils/gtag.js`
- `gtag` is loaded in `_document.tsx` with measurement ID
- `pageview(url)` called on every route change in `_app.tsx`
- Purchase conversion event fired in `thank-you.tsx`
- Events: `purchase`, `add_to_cart`, `begin_checkout`

### PostHog
- SDK loaded via `src/components/posthog-init.tsx`
- Client utility: `src/utils/posthog-client.ts`
- Reverse proxied through `/ingest/*` rewrites in `next.config.js` to bypass ad blockers
- Not loaded on `/admin` routes
- Page views captured automatically; custom events for purchases, signups

### Microsoft Clarity
- Package `@microsoft/clarity` installed
- Loaded in `_document.tsx` or `posthog-init.tsx`

### Lead Tracking
- `src/utils/leadTracking.ts` — `LeadTracker.captureLeadData()`
- Captures UTM params, referrer from URL on first load
- Stored in localStorage for attribution

### Active Users System (DEACTIVATED)
- As of November 2025, the active users real-time tracking system has been fully disabled
- The `ACTIVE_USERS_SYSTEM.md` documents it for historical reference
- Tables `active_users` and `daily_visits` may still exist in database but are no longer populated or displayed

---

## 21. Third-Party Integrations

| Service | Purpose | Config |
|---|---|---|
| **Square** | Payment processing | `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT` |
| **Supabase** | Database + Auth + Storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Spotify API** | Track search, artist data | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` |
| **MailJet** | Transactional email | `MAILJET_API_KEY`, `MAILJET_SECRET_KEY` |
| **MailerLite** | Email marketing lists | `MAILERLITE_API_KEY` |
| **Followiz** | SMM panel for Spotify streams | `FOLLOWIZ_API_KEY`, `FOLLOWIZ_API_URL` |
| **Zapier** | Webhook automation | URL stored in `admin_settings.zapier_webhook_url` |
| **Google Sheets** | Curator data + Power Tools | Service account credentials in env vars |
| **Sanity** | Blog CMS | `NEXT_PUBLIC_SANITY_PROJECT_ID`, `SANITY_READ_TOKEN` |
| **PostHog** | Product analytics | `NEXT_PUBLIC_POSTHOG_KEY` |
| **Google Analytics/Ads** | Conversion tracking | `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| **Freshdesk** | Customer support tickets | `FRESHDESK_API_KEY`, `FRESHDESK_DOMAIN` |
| **Airtable** | Legacy data (see `airtableService.ts`) | `AIRTABLE_API_KEY` |
| **Authorize.net** | Legacy payment processor (no longer primary) | `AUTHORIZE_NET_API_LOGIN_ID`, `AUTHORIZE_NET_TRANSACTION_KEY` |

---

## 22. API Routes Reference

### Public API Routes (No Auth Required)
```
POST /api/spotify/search              Search Spotify tracks
GET  /api/spotify/artist              Get artist by ID
GET  /api/spotify/artist-search       Search artists
POST /api/validate-coupon             Validate coupon code
GET  /api/site-settings               Get site title/description
GET  /api/sales-banner-settings       Get sales banner text
POST /api/validate-checkout-session   Check if session is valid
POST /api/recover-checkout-session    Recover expired session
POST /api/square-payment              Process Square payment
POST /api/process-payment-accept      Process Authorize.net payment (legacy)
POST /api/send-zapier-webhook         Trigger Zapier event
GET  /api/user-profile                Get current user profile
GET  /api/user-artist-profile         Get artist profile for current user
POST /api/sync-user-profile           Sync user profile data
POST /api/auto-confirm-user           Auto-confirm email (admin utility)
GET  /api/curator-connect             Fetch curator list (Google Sheets)
POST /api/curator-contact-track       Track curator contact
GET  /api/curator-contacts            Get user's contact history
GET  /api/user/fashokens              Get user FASHOkens balance + ledger
GET  /api/oembed                      oEmbed endpoint for blog embeds
GET  /api/sitemap.xml                 Main sitemap
POST /api/sanity/revalidate           ISR revalidation webhook for Sanity
GET  /api/blog/*                      Blog API (RSS, sitemap, CRUD for legacy blog)
```

### User Auth Routes
```
GET  /api/auth/callback               OAuth/magic link callback handler
POST /api/auth/signout                Sign out current user
GET  /api/get-user-first-name         Server-side user session check (used in authContext)
```

### Admin Auth Routes
```
POST /api/admin/auth/login            Admin login → sets admin_session cookie
POST /api/admin/auth/logout           Clear admin session cookie
GET  /api/admin/auth/verify           Verify current admin session
```

### Admin-Only Routes (Require `admin_session` cookie with valid JWT)
```
GET  /api/admin/analytics             Dashboard stats (orders, revenue)
GET  /api/admin/orders                Order list (search, filter, paginate)
GET  /api/admin/order/[orderId]       Order detail
PUT  /api/admin/order/[orderId]       Update order (status, notes)
GET  /api/admin/customers             Customer list (aggregated from orders)
GET  /api/admin/customer/[email]      Customer detail
GET  /api/admin/customer/playlist-placement-history
GET  /api/admin/coupons               List coupons
POST /api/admin/coupons               Create coupon
PUT  /api/admin/coupons               Update coupon
DELETE /api/admin/coupons             Delete coupon
GET  /api/admin/email-templates       List email templates
POST /api/admin/email-templates       Create template
PUT  /api/admin/email-templates       Update template
DELETE /api/admin/email-templates     Delete template
GET  /api/admin/email-settings        Email notification settings
PUT  /api/admin/email-settings        Update email settings
GET  /api/admin/admin-settings        All admin settings (key-value)
PUT  /api/admin/admin-settings        Update settings
GET  /api/admin/mailerlite-config     MailerLite config from admin_settings
PUT  /api/admin/mailerlite-config     Update MailerLite config
GET  /api/admin/mailerlite-groups     Fetch MailerLite groups from API
GET  /api/admin/mailerlite-history    Email send history
POST /api/admin/mailerlite-test       Test MailerLite push
GET  /api/admin/fashokens/customers   All loyalty customers
GET  /api/admin/fashokens/customer-balance
GET  /api/admin/fashokens/ledger      Global ledger
POST /api/admin/fashokens/adjust      Adjust user token balance
POST /api/admin/fashokens/bulk-credit
GET  /api/admin/fashokens/settings    Loyalty program settings
PUT  /api/admin/fashokens/settings    Update loyalty settings
POST /api/admin/add-order-item        Add item to existing order
PUT  /api/admin/update-order-item-package  Change package on order item
POST /api/admin/validate-spotify-url
GET  /api/admin/user-profile          Get user profile by userId
GET  /api/admin/check-email-tables    Verify email tables exist
POST /api/admin/tezting-email-template  Test email template
POST /api/admin/cache-management      Clear server-side cache
```

### Marketing Manager Routes (Admin Auth)
See §11 for full list.

---

## 23. Key Components

| Component | Purpose |
|---|---|
| `Header.tsx` | Site navigation; shows user login state; links to dashboard |
| `Footer.tsx` | Site footer with links |
| `TrackCard.tsx` | Displays a Spotify track with image, title, artist, play button |
| `PackageCard.tsx` | Package pricing card |
| `SalesBanner.tsx` | Top-of-page sale notification bar |
| `SalesBannerDesktop.tsx` / `SalesBannerMobile.tsx` | Platform-specific banner renderers |
| `SalesPop.tsx` | Social proof popup ("X just bought a campaign") |
| `HeroParticles.tsx` | Animated particle background for hero section |
| `Particles.tsx` | General particle animation component |
| `GlareHover.tsx` | Glare effect on hover for cards |
| `SpotlightCard.tsx` | Card with spotlight hover effect |
| `StepIndicator.tsx` | Multi-step progress indicator in checkout |
| `CampaignProgressBar.tsx` | Shows campaign fulfillment progress |
| `IntakeFormModal.tsx` | Modal for collecting artist intake info post-purchase |
| `LegalModal.tsx` | Shows terms/privacy in a modal |
| `FashokensSection.tsx` | FASHOkens token balance display and spend toggle in checkout |
| `ArtistInsightsCard.tsx` | Spotify artist stats card on home page |
| `LiveCounter.tsx` | Animated counter of active artists |
| `SplitText.tsx` | Text split animation component |
| `ScrollFloat.tsx` | Scroll-triggered float animation |
| `ShapeDivider.tsx` | SVG wave dividers between sections |
| `VerticalShapeDivider.tsx` | Vertical version of shape divider |
| `PowerToolCard.tsx` | Individual affiliate tool card |
| `PowerToolsCarousel.tsx` | Horizontal scroll carousel of power tools |
| `PowerToolsTab.tsx` | Full power tools tab with filtering |
| `MonthlyOrdersChart.tsx` | Chart.js bar chart of monthly orders (admin) |
| `DashboardTour.tsx` | Guided intro.js tour for user dashboard |
| `MarketingManager.tsx` | Full Marketing Manager UI (admin) |
| `AdminOrdersWithSubTabs.tsx` | Orders + Customers sub-tabs (admin) |
| `AdminEmailManagement.tsx` | Email templates manager (admin) |
| `AdminCouponsManagement.tsx` | Coupon codes manager (admin) |
| `AdminSettingsManagement.tsx` | Site settings manager (admin) |
| `AdminFashokensManagement.tsx` | FASHOkens admin panel |
| `AdminMailerLiteManagement.tsx` | MailerLite management panel |
| `AdminCustomersManagement.tsx` | Customer list component |
| `AdminAccessDenied.tsx` | Shown when admin auth fails |
| `BlogHeader.tsx` | Blog section header |
| `PortableTextRenderer.tsx` | Renders Sanity PortableText blocks |
| `posthog-init.tsx` | PostHog initialization (client component) |

---

## 24. Critical Rules & Known Issues

### ABSOLUTE CODING RULES (from rules.txt)

1. **ALWAYS use `rem` for text sizing.** Never use Tailwind's `text-xl`, `text-2xl` etc. Use inline styles or CSS with rem values for precise control.

2. **ALWAYS use HTML/CSS/SVG for animations.** Never use GSAP or other JS animation libraries for website animations. Use CSS keyframes.

3. **Animation library isolation:** Never import interactive third-party libraries (AOS, GSAP, Lottie) in layout or server components. Always create a dedicated client component with `'use client'`.

4. **The user cannot code.** Never ask the user to edit code manually. Handle everything yourself. Exception: the user is willing to run SQL in the Supabase dashboard manually.

5. **Search online for persistent bugs.** If a bug persists after your first fix, search the web extensively before trying again.

6. **Keep recap messages short.** Don't waste tokens on long explanations.

### CRITICAL: Admin Password Hash in .env.local
```
# WRONG ($ will be interpreted as variable):
ADMIN_PASSWORD_HASH=$2b$12$examplehash

# CORRECT (escape all $ signs):
ADMIN_PASSWORD_HASH=\$2b\$12\$examplehash
```
After changing .env.local, restart the dev server. Test with `POST /api/admin/auth/login`.

### CRITICAL: Local Dev Server Setup
- **Always use Node 20** for local dev: `/opt/homebrew/opt/node@20/bin/node`
- Dev runs on port **3001**: `npm run dev` (calls `bash ./scripts/dev-with-node20.sh`)
- **Never run `npm install` while dev server is running** — corrupts Turbopack cache
- If Turbopack SST errors occur, `rm -rf .next` then restart
- `turbopackFileSystemCacheForDev: false` is set in `next.config.js` — DO NOT REMOVE THIS
- **Never switch from Turbopack to webpack** (`--webpack` flag) — causes infinite Fast Refresh loop

### CRITICAL: Payment Processing
- Square is the **primary** payment processor
- Authorize.net code still exists (`checkout-accept.tsx`, `/api/process-payment-accept.ts`) but is legacy
- Square SDK v43+ uses `BigInt` for amounts internally — amounts in responses are BigInt, must be converted with `Number()` before JSON serialization
- Square environment must be set to `production` for live charges

### CRITICAL: Supabase Client Usage
- `createClient()` from `utils/supabase/client.ts` — browser only
- `createClient(req, res)` from `utils/supabase/server.ts` — API routes (uses anon key, respects RLS)
- `createClientSSR(context)` from `utils/supabase/server.ts` — `getServerSideProps` only
- `createAdminClient()` from `utils/supabase/server.ts` — server only, uses service role key, **bypasses all RLS**. Use for admin operations only.

### CRITICAL: Checkout Session Flow
- Sessions stored in Supabase `checkout_sessions` table (NOT in-memory — was fixed after a critical bug)
- Sessions expire after 24 hours
- Sessions are marked `is_used = true` after successful order creation to prevent replay
- If a user navigates back to change packages, the old session is invalidated and a new one is created
- `/api/recover-checkout-session` attempts automatic recovery before failing

### Known Architecture Notes
- The Pages Router is used throughout (NOT the App Router). Do not refactor to App Router.
- `admin.tsx` is the single admin page; tabs are swapped in-place via state/URL params. There is no separate `/admin/orders`, etc. — those routes exist only for detail pages.
- The blog is dual-source: Sanity (primary) and Supabase (legacy fallback). Always check if Sanity is configured before fetching.
- The `apify-spotify-playlist.ts` utility exists but may not be actively used in main flows.
- `checkout-sq.tsx` and `checkout-accept.tsx` are separate checkout page variants. The main checkout is `checkout.tsx` which uses Square.

### Sub-admin Access Control
Sub-admins (`sub_admin` role) can ONLY access:
- Orders tab (`?p=orders`)
- Marketing Manager tab (`?p=marketing-manager`)

Any navigation attempt to other tabs redirects them to the orders tab. This is enforced both in `admin.tsx` (frontend redirect) and in API routes via `requireAdminRole('admin')` middleware.

### RLS Policies Summary
- Users can only read their own `orders` and `order_items` (by `user_id`)
- Service role bypasses all RLS — used in admin API routes and checkout order creation
- `curator_contacts` — users see only their own rows
- `loyalty_accounts` / `loyalty_ledger` — users see only their own rows

---

*This document was generated by full codebase scan on 2026-03-03. Update it whenever major architecture changes are made.*
