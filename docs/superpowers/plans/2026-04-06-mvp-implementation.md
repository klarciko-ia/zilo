# Zilo MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild both admin consoles and integrate Stripe payments to produce a demo-ready MVP for 2-3 test restaurants across Canada, Bali, and Morocco.

**Architecture:** Next.js 14 App Router frontend, Supabase Postgres + Realtime backend, Stripe Checkout for payments. Three interfaces: Master Console (CRM), Restaurant Admin (operations), Guest flow (ordering/payment). Clean Slate rebuild of admin frontends, polish of guest flow.

**Tech Stack:** Next.js 14, React 18, Tailwind CSS, Supabase JS 2.45, Stripe (checkout + webhooks), lucide-react, Vercel.

**Spec:** `docs/superpowers/specs/2026-04-06-mvp-dashboards-design.md`

---

## File Structure

### New Files
```
lib/format-currency.ts                          — currency formatting helper
lib/stripe.ts                                   — Stripe server client singleton
lib/order-lifecycle.ts                          — order status transitions
components/master/master-overview.tsx            — Master Overview page component
components/master/master-customer-detail.tsx     — Customer Detail page component
components/master/master-add-customer.tsx        — Add Customer modal + summary
components/master/master-activity-feed.tsx       — Activity feed component
components/master/master-kpi-cards.tsx           — 4 KPI cards component
components/restaurant/restaurant-shell.tsx       — Restaurant Admin layout (top bar)
components/restaurant/tables-grid.tsx            — Tables grid view
components/restaurant/table-detail.tsx           — Single table order detail
components/restaurant/owner-banner.tsx           — Owner-only stats banner
components/restaurant/item-availability.tsx      — 86 toggle panel
app/admin/restaurant/page.tsx                   — Restaurant Admin home
app/admin/restaurant/layout.tsx                 — Restaurant Admin layout
app/api/payments/charge/route.ts                — Payment abstraction endpoint
app/api/payments/webhook/route.ts               — Stripe webhook handler
app/api/restaurant/tables/route.ts              — Tables + orders for a restaurant
app/api/restaurant/orders/[id]/confirm/route.ts — Confirm an order
app/api/restaurant/items/[id]/toggle/route.ts   — Toggle item availability
app/api/restaurant/staff/route.ts               — CRUD staff accounts
supabase/migrations/0008_currency_staff.sql     — DB migration
```

### Modified Files
```
lib/types.ts                    — add OrderStatus, TableStatus, currency types
lib/supabase.ts                 — ensure works with real Supabase credentials
lib/admin-auth.ts               — support restaurant_owner + restaurant_staff login
lib/admin-session.ts            — add restaurant_staff role
lib/seed-data.ts                — add currency to demo restaurants
app/api/admin/login/route.ts    — handle restaurant_staff role
app/api/master/restaurants/route.ts — add currency field to create/list
app/table/[id]/menu/page.tsx    — use formatCurrency, show sold-out
app/table/[id]/checkout/*/      — integrate Stripe Checkout
components/table-menu-cart-client.tsx — sold-out items, currency formatting
components/review-client.tsx    — polish review flow
app/master/login/page.tsx       — keep as-is
app/restaurant/login/page.tsx   — support owner + staff
package.json                    — add stripe dependency
.env.local                      — add Stripe keys
```

### Jettisoned Files (delete)
```
components/admin-dashboard-client.tsx
components/admin-feedback-client.tsx
components/kitchen-display-client.tsx
components/master/master-overview-client.tsx
components/master/master-restaurants-client.tsx
components/master/master-restaurant-detail-client.tsx
components/master/new-restaurant-modal.tsx
app/admin/dashboard/page.tsx
app/admin/kitchen/
app/admin/master/analytics/
app/admin/master/finance/
app/admin/master/settings/
```

---

## Task 0: Prerequisites — Supabase + Stripe + Vercel

**Files:**
- Modify: `.env.local`
- Modify: `package.json`
- Create: `supabase/migrations/0008_currency_staff.sql`

- [ ] **Step 1: Set up Supabase cloud project**

Go to https://supabase.com, create a new project. Run `supabase/full_setup.sql` in the SQL editor. Copy the project URL and anon key.

Update `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...YOUR_REAL_KEY
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

- [ ] **Step 2: Install Stripe**

```bash
npm install stripe @stripe/stripe-js
```

- [ ] **Step 3: Write migration for currency + staff role**

Create `supabase/migrations/0008_currency_staff.sql`:
```sql
-- Add currency to restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

-- Update role constraint to include restaurant_staff
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('super_admin', 'restaurant_owner', 'restaurant_admin', 'restaurant_staff'));
```

Run this in the Supabase SQL editor.

- [ ] **Step 4: Verify Supabase connection**

```bash
curl -s "https://YOUR_PROJECT.supabase.co/rest/v1/restaurants?select=id,name" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Expected: JSON array of restaurants (empty if no seed data).

- [ ] **Step 5: Create Stripe test account**

Go to https://dashboard.stripe.com/test, sign up. Copy test keys to `.env.local`. No Connect setup needed yet for test mode.

- [ ] **Step 6: Commit**

```bash
git add .env.local package.json package-lock.json supabase/migrations/0008_currency_staff.sql
git commit -m "chore: add Stripe deps, currency migration, env setup"
```

---

## Task 1: Shared Utilities

**Files:**
- Create: `lib/format-currency.ts`
- Create: `lib/stripe.ts`
- Create: `lib/order-lifecycle.ts`
- Modify: `lib/types.ts`

- [ ] **Step 1: Create currency formatter**

Create `lib/format-currency.ts`:
```typescript
const CURRENCY_CONFIG: Record<string, { locale: string; decimals: number }> = {
  USD: { locale: "en-US", decimals: 2 },
  CAD: { locale: "en-CA", decimals: 2 },
  MAD: { locale: "fr-MA", decimals: 2 },
  IDR: { locale: "id-ID", decimals: 0 },
};

export function formatCurrency(amount: number, currency: string): string {
  const config = CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.USD;
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
}
```

- [ ] **Step 2: Create Stripe server client**

Create `lib/stripe.ts`:
```typescript
import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    stripeInstance = new Stripe(key, { apiVersion: "2024-06-20" });
  }
  return stripeInstance;
}
```

- [ ] **Step 3: Create order lifecycle helpers**

Create `lib/order-lifecycle.ts`:
```typescript
export type OrderStatus = "pending" | "confirmed" | "awaiting_payment" | "pending_cash" | "paid";
export type TableDisplayStatus = "free" | "ordering" | "confirmed" | "awaiting_payment";

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed"],
  confirmed: ["awaiting_payment"],
  awaiting_payment: ["pending_cash", "paid"],
  pending_cash: ["paid"],
  paid: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function deriveTableStatus(orderStatus: OrderStatus | null): TableDisplayStatus {
  if (!orderStatus) return "free";
  if (orderStatus === "pending") return "ordering";
  if (orderStatus === "confirmed") return "confirmed";
  if (orderStatus === "awaiting_payment" || orderStatus === "pending_cash") return "awaiting_payment";
  return "free";
}
```

- [ ] **Step 4: Update types**

Add to `lib/types.ts`:
```typescript
export type OrderStatus = "pending" | "confirmed" | "awaiting_payment" | "pending_cash" | "paid";
export type TableDisplayStatus = "free" | "ordering" | "confirmed" | "awaiting_payment";
export type Currency = "USD" | "CAD" | "MAD" | "IDR";
export type AdminRole = "super_admin" | "restaurant_owner" | "restaurant_admin" | "restaurant_staff";
```

- [ ] **Step 5: Verify types compile**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/format-currency.ts lib/stripe.ts lib/order-lifecycle.ts lib/types.ts
git commit -m "feat: add currency formatter, Stripe client, order lifecycle helpers"
```

---

## Task 2: Master Console — Overview

**Files:**
- Create: `components/master/master-kpi-cards.tsx`
- Create: `components/master/master-activity-feed.tsx`
- Create: `components/master/master-overview.tsx`
- Modify: `app/admin/master/page.tsx`
- Modify: `app/api/master/restaurants/route.ts` (add currency, activity data)

- [ ] **Step 1: Create KPI cards component**

Create `components/master/master-kpi-cards.tsx` — a row of 4 cards. Props: `{ active: number, newThisMonth: number, mrr: number, mrrCurrency: string, overdue: number }`. Each card is a colored box with icon, label, value. Use `formatCurrency` for MRR. Use lucide-react icons: `Building2`, `TrendingUp`, `DollarSign`, `AlertTriangle`.

- [ ] **Step 2: Create activity feed component**

Create `components/master/master-activity-feed.tsx` — a list of recent events. Props: `{ events: { id: string, restaurantName: string, message: string, time: string }[] }`. Render as a simple list with relative timestamps.

- [ ] **Step 3: Create overview page component**

Create `components/master/master-overview.tsx` — composes KPI cards + client list table + activity feed. Fetches from `/api/master/restaurants` on mount. The client list is a compact table: Name, Tier, Status, MRR, Last Activity. Click row → navigate to `/admin/master/restaurants/{id}`. "Add Customer" button at top. Search input. Status filter tabs.

- [ ] **Step 4: Update API to return currency + activity**

Modify `app/api/master/restaurants/route.ts`: add `currency` field to restaurant response. Add a new field `lastOrderAt` (latest order timestamp per restaurant). For demo-store fallback, return mock activity data.

- [ ] **Step 5: Wire up the page**

Modify `app/admin/master/page.tsx` to render `MasterOverview`.

- [ ] **Step 6: Test in browser**

Navigate to `http://localhost:3016/admin/master`. Verify: 4 KPI cards show data, client list displays restaurants, activity feed shows events.

- [ ] **Step 7: Commit**

```bash
git add components/master/ app/admin/master/page.tsx app/api/master/restaurants/route.ts
git commit -m "feat: rebuild Master Console overview with KPI cards, client list, activity feed"
```

---

## Task 3: Master Console — Customer Detail + Onboarding

**Files:**
- Create: `components/master/master-customer-detail.tsx`
- Create: `components/master/master-add-customer.tsx`
- Modify: `app/admin/master/restaurants/[id]/page.tsx`
- Modify: `app/api/master/restaurants/route.ts` (POST: add currency, country)
- Modify: `app/api/master/restaurants/[id]/dashboard/route.ts`

- [ ] **Step 1: Create customer detail component**

Create `components/master/master-customer-detail.tsx` — single scrollable page. Header: name + tier badge + status badge + "Open Guest Menu" button (with table selector dropdown, opens in new tab). Three sections: Info (email, plan, price, currency, created, tables), Activity (total orders, revenue, last order), Actions (tier change dropdown, deactivate button).

- [ ] **Step 2: Create add customer modal with summary**

Create `components/master/master-add-customer.tsx` — two states: form and summary.

**Form state:** fields for name, owner name, owner email, owner phone (optional), country (dropdown: Canada/Indonesia/Morocco/Other), currency (auto-set from country, editable), number of tables, tier. Submit calls POST `/api/master/restaurants`.

**Summary state (shown after successful creation):** displays restaurant name, login URL, email, default password, all table links. "Copy all info" button that copies formatted text to clipboard. "Done" button to close.

- [ ] **Step 3: Update POST API for country + currency**

Modify POST in `app/api/master/restaurants/route.ts`: accept `country` and `currency` fields. Pass `currency` to restaurant insert. For demo-store, save currency on the restaurant object.

- [ ] **Step 4: Update dashboard API**

Modify `app/api/master/restaurants/[id]/dashboard/route.ts`: return `currency` in restaurant object. Return `lastOrderAt` from orders query.

- [ ] **Step 5: Wire up detail page**

Modify `app/admin/master/restaurants/[id]/page.tsx` to render `MasterCustomerDetail`.

- [ ] **Step 6: Test full flow**

Create a new customer via the modal. Verify summary shows all info. Click "Copy all info". Navigate to customer detail page. Verify all sections render. Click "Open Guest Menu" → verify it opens the correct table link in a new tab.

- [ ] **Step 7: Commit**

```bash
git add components/master/ app/admin/master/ app/api/master/
git commit -m "feat: customer detail page + add customer with onboarding summary"
```

---

## Task 4: Master Console — Cleanup

**Files:**
- Delete: old master components (master-overview-client.tsx, master-restaurants-client.tsx, master-restaurant-detail-client.tsx, new-restaurant-modal.tsx)
- Delete: `app/admin/master/analytics/`, `app/admin/master/finance/`, `app/admin/master/settings/`
- Modify: `components/master/master-shell.tsx` — simplify sidebar to 3 items

- [ ] **Step 1: Simplify sidebar**

Modify `components/master/master-shell.tsx`: NAV array = Overview (`/admin/master`), Customers (`/admin/master/restaurants`), Logout. Remove all other nav items.

- [ ] **Step 2: Delete old files**

Delete old master components and placeholder pages.

- [ ] **Step 3: Verify no broken imports**

```bash
npx tsc --noEmit
```

Fix any import errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old master console files, simplify sidebar"
```

---

## Task 5: Restaurant Admin — Layout + Tables Grid

**Files:**
- Create: `components/restaurant/restaurant-shell.tsx`
- Create: `components/restaurant/owner-banner.tsx`
- Create: `components/restaurant/tables-grid.tsx`
- Create: `app/admin/restaurant/layout.tsx`
- Create: `app/admin/restaurant/page.tsx`
- Create: `app/api/restaurant/tables/route.ts`

- [ ] **Step 1: Create restaurant shell (top bar layout)**

Create `components/restaurant/restaurant-shell.tsx`: top bar with restaurant name (left), optional menu icon for item-86, logout (right). No sidebar. `children` slot for main content. Mobile-first: full width, touch targets min 44px.

- [ ] **Step 2: Create owner banner**

Create `components/restaurant/owner-banner.tsx`: small horizontal bar showing revenue today, orders today, pending cash count. Props: `{ revenue: number, orders: number, pendingCash: number, currency: string }`. Only rendered when session role = `restaurant_owner`.

- [ ] **Step 3: Create tables API**

Create `app/api/restaurant/tables/route.ts`: GET returns all tables for the logged-in restaurant, each with its current order status and order details (items, total, created_at). Joins `restaurant_tables` → `table_orders` (latest non-paid) → `order_items`. Query param: `restaurantId`.

- [ ] **Step 4: Create tables grid component**

Create `components/restaurant/tables-grid.tsx`: fetches from `/api/restaurant/tables`. Renders a responsive grid of cards. Each card: table number, color-coded status badge (grey=free, blue=ordering, green=confirmed, orange=awaiting payment), order amount, time since order. Tap → navigate to table detail. Supabase Realtime subscription on `table_orders` table filtered by restaurant_id — auto-refresh grid when orders change.

- [ ] **Step 5: Wire up layout + page**

Create `app/admin/restaurant/layout.tsx` with `RestaurantShell`. Create `app/admin/restaurant/page.tsx` rendering `OwnerBanner` (conditionally) + `TablesGrid`.

- [ ] **Step 6: Test in browser**

Login as restaurant owner at `/restaurant/login`. Verify: top bar shows restaurant name, banner shows stats (owner only), tables grid shows all tables with correct statuses.

- [ ] **Step 7: Commit**

```bash
git add components/restaurant/ app/admin/restaurant/ app/api/restaurant/
git commit -m "feat: restaurant admin layout, tables grid with realtime updates"
```

---

## Task 6: Restaurant Admin — Table Detail + Order Confirm

**Files:**
- Create: `components/restaurant/table-detail.tsx`
- Create: `app/api/restaurant/orders/[id]/confirm/route.ts`
- Modify: `app/api/restaurant/tables/route.ts` (if needed)

- [ ] **Step 1: Create order confirm API**

Create `app/api/restaurant/orders/[id]/confirm/route.ts`: POST transitions order from `pending` → `confirmed` or `confirmed` → `awaiting_payment`. Uses `canTransition()` from `lib/order-lifecycle.ts`. Validates the order belongs to the staff's restaurant.

- [ ] **Step 2: Create table detail component**

Create `components/restaurant/table-detail.tsx`: renders as a slide-up panel or full page. Shows: table number, all items ordered (name, qty, price), order total, order status, time since placed. Action buttons change based on status:
- `pending` → "Confirm Order" (big green button)
- `confirmed` → "Mark Awaiting Payment" (when food is served)
- `awaiting_payment` → "Confirm Cash Payment" button + "Paid by card" indicator
- `paid` → "Clear Table" button

Calls the confirm API on button press. Uses `formatCurrency` for all amounts.

- [ ] **Step 3: Test order confirmation flow**

Open restaurant admin. Tap a table with a pending order. Tap "Confirm Order". Verify status changes to confirmed. Verify the tables grid updates.

- [ ] **Step 4: Commit**

```bash
git add components/restaurant/table-detail.tsx app/api/restaurant/orders/
git commit -m "feat: table detail view with order confirmation flow"
```

---

## Task 7: Restaurant Admin — Item Availability (86)

**Files:**
- Create: `components/restaurant/item-availability.tsx`
- Create: `app/api/restaurant/items/[id]/toggle/route.ts`

- [ ] **Step 1: Create toggle API**

Create `app/api/restaurant/items/[id]/toggle/route.ts`: POST flips `is_available` on the menu item. Validates the item belongs to the staff's restaurant.

- [ ] **Step 2: Create item availability panel**

Create `components/restaurant/item-availability.tsx`: fetches all menu items for the restaurant. Displays as a simple list with toggle switches. Item name on left, on/off toggle on right. Toggling calls the API. Opens from the menu icon in the top bar (restaurant shell).

- [ ] **Step 3: Update guest menu to show sold-out**

Modify `components/table-menu-cart-client.tsx`: items where `isAvailable === false` render with reduced opacity, "Sold out" badge, and disabled "Add" button.

- [ ] **Step 4: Test**

Toggle an item off in restaurant admin. Open the guest menu for that restaurant. Verify the item shows as sold out and cannot be added to cart.

- [ ] **Step 5: Commit**

```bash
git add components/restaurant/item-availability.tsx app/api/restaurant/items/ components/table-menu-cart-client.tsx
git commit -m "feat: item 86 toggle for restaurant staff, sold-out display for guests"
```

---

## Task 8: Restaurant Admin — Staff Accounts

**Files:**
- Create: `app/api/restaurant/staff/route.ts`
- Modify: `components/restaurant/restaurant-shell.tsx` (add staff management for owner)
- Modify: `app/api/admin/login/route.ts` (handle restaurant_staff)
- Modify: `lib/admin-auth.ts` (support restaurant_staff)

- [ ] **Step 1: Create staff CRUD API**

Create `app/api/restaurant/staff/route.ts`: GET lists staff for this restaurant. POST creates a new staff account (email, password, name) with role `restaurant_staff` and the owner's `restaurant_id`. Only `restaurant_owner` can call this.

- [ ] **Step 2: Update login to support restaurant_staff**

Modify `app/api/admin/login/route.ts`: allow `restaurant_staff` role to login. Modify `lib/admin-auth.ts` accordingly.

- [ ] **Step 3: Add staff management UI for owner**

In the restaurant shell, add a "Staff" icon visible only to `restaurant_owner`. Opens a simple panel: list of staff members + "Add Staff" form (name, email, password).

- [ ] **Step 4: Test**

Login as owner. Create a staff account. Logout. Login as the new staff. Verify: tables grid visible, owner banner hidden, staff management hidden.

- [ ] **Step 5: Commit**

```bash
git add app/api/restaurant/staff/ components/restaurant/ app/api/admin/login/ lib/admin-auth.ts
git commit -m "feat: staff account creation and restricted staff view"
```

---

## Task 9: Stripe Payment Integration

**Files:**
- Create: `app/api/payments/charge/route.ts`
- Create: `app/api/payments/webhook/route.ts`
- Modify: `app/table/[id]/checkout/card/page.tsx`
- Modify: `components/card-payment-client.tsx`

- [ ] **Step 1: Create charge endpoint**

Create `app/api/payments/charge/route.ts`: accepts `{ orderId, amount, currency, tableSlug }`. Creates a Stripe Checkout session with the amount/currency. Returns the checkout URL. Sets `success_url` to `/table/{tableSlug}/checkout/success` and `cancel_url` to `/table/{tableSlug}/checkout/method`. Stores session ID in the payment record.

- [ ] **Step 2: Create webhook endpoint**

Create `app/api/payments/webhook/route.ts`: listens for `checkout.session.completed`. Verifies signature with `STRIPE_WEBHOOK_SECRET`. On success: updates payment status to `paid`, updates order `amount_paid`, and if fully paid, sets order status to `paid`.

- [ ] **Step 3: Update card payment page**

Modify `components/card-payment-client.tsx`: instead of simulating, call `/api/payments/charge` and redirect to the Stripe Checkout URL. On return (success_url), show the success screen.

- [ ] **Step 4: Test with Stripe test cards**

Use card number `4242 4242 4242 4242` with any future expiry. Verify: redirect to Stripe, payment completes, redirect back to success, order marked as paid.

- [ ] **Step 5: Commit**

```bash
git add app/api/payments/charge/ app/api/payments/webhook/ components/card-payment-client.tsx app/table/
git commit -m "feat: Stripe Checkout integration with webhooks"
```

---

## Task 10: Realtime Notifications

**Files:**
- Modify: `components/restaurant/tables-grid.tsx`
- Modify: Supabase Realtime config (already enabled for some tables)

- [ ] **Step 1: Add Realtime subscription to tables grid**

In `components/restaurant/tables-grid.tsx`: subscribe to `table_orders` changes filtered by `restaurant_id`. On INSERT or UPDATE, refetch the tables data. Show a toast notification with "Table X — New order!" and vibrate the device if supported (`navigator.vibrate(200)`).

- [ ] **Step 2: Add pulsing badge to table cards**

When a table's order status changes, the card briefly pulses (CSS animation). New orders get a dot badge that disappears when the server taps the card.

- [ ] **Step 3: Test**

Open restaurant admin in one tab. Open guest menu in another. Place an order as guest. Verify: restaurant admin shows notification, table card updates, badge appears.

- [ ] **Step 4: Commit**

```bash
git add components/restaurant/tables-grid.tsx
git commit -m "feat: realtime order notifications with vibration and badges"
```

---

## Task 11: Guest Flow Polish

**Files:**
- Modify: `components/table-menu-cart-client.tsx` — currency formatting
- Modify: `components/table-landing-client.tsx` — clean up
- Modify: `app/table/[id]/menu/page.tsx` — pass currency
- Modify: `lib/table-guest-context.ts` — add currency to context
- Modify: split payment pages — currency formatting

- [ ] **Step 1: Add currency to table guest context**

Modify `lib/table-guest-context.ts`: add `currency` field to `TableGuestContext`. Fetch from `restaurants.currency`. Default to `USD` in demo fallback.

- [ ] **Step 2: Pass currency through menu page**

Modify `app/table/[id]/menu/page.tsx`: pass `currency` prop to `TableMenuCartClient`.

- [ ] **Step 3: Update menu client with currency formatting**

Modify `components/table-menu-cart-client.tsx`: replace all hardcoded `MAD`/`$` with `formatCurrency(price, currency)`. Apply to item prices, cart total, subtotal.

- [ ] **Step 4: Update split payment pages**

Modify percentage and item split pages to use `formatCurrency` instead of hardcoded currency symbols.

- [ ] **Step 5: Test with different currencies**

Create a test restaurant with currency IDR. Open guest menu. Verify prices show as "Rp 28.000" not "$28.00".

- [ ] **Step 6: Commit**

```bash
git add lib/table-guest-context.ts app/table/ components/table-menu-cart-client.tsx components/*payment*
git commit -m "feat: multi-currency support across guest flow"
```

---

## Task 12: Post-Payment Review Flow

**Files:**
- Modify: `components/review-client.tsx` — polish
- Modify: `components/payment-success-client.tsx` — link to review

- [ ] **Step 1: Polish review client**

Modify `components/review-client.tsx`: ensure the flow is clean:
1. Star rating (1-5, big touch targets)
2. If 4-5 → "Share on Google?" with redirect button
3. If 1-3 → "Tell us more" textarea → submit internally
4. Thank you screen

- [ ] **Step 2: Link from payment success**

Modify `components/payment-success-client.tsx`: after "Payment successful", show a CTA "Rate your experience" linking to the review page.

- [ ] **Step 3: Test**

Complete a payment. Verify success page shows review CTA. Click through. Rate 5 stars → verify Google redirect appears. Rate 2 stars → verify feedback form appears.

- [ ] **Step 4: Commit**

```bash
git add components/review-client.tsx components/payment-success-client.tsx
git commit -m "feat: polish post-payment review flow with Google redirect"
```

---

## Task 13: Cleanup Old Files

**Files:**
- Delete: old admin dashboard components and pages

- [ ] **Step 1: Delete jettisoned files**

```bash
rm -f components/admin-dashboard-client.tsx
rm -f components/admin-feedback-client.tsx
rm -f components/kitchen-display-client.tsx
rm -f components/master/master-overview-client.tsx
rm -f components/master/master-restaurants-client.tsx
rm -f components/master/master-restaurant-detail-client.tsx
rm -f components/master/new-restaurant-modal.tsx
rm -rf app/admin/kitchen/
rm -rf app/admin/master/analytics/
rm -rf app/admin/master/finance/
rm -rf app/admin/master/settings/
```

- [ ] **Step 2: Fix any broken imports**

```bash
npx tsc --noEmit
```

Fix remaining import errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove legacy admin components and placeholder pages"
```

---

## Task 14: Deploy to Vercel

**Files:**
- None (deployment config)

- [ ] **Step 1: Build locally**

```bash
npm run build
```

Fix any build errors.

- [ ] **Step 2: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 3: Connect to Vercel**

Go to https://vercel.com/new. Import the GitHub repo. Set environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

Deploy.

- [ ] **Step 4: Set up Stripe webhook**

In Stripe Dashboard → Developers → Webhooks: add endpoint `https://zilo.vercel.app/api/payments/webhook`. Select event `checkout.session.completed`. Copy the webhook signing secret to Vercel env vars.

- [ ] **Step 5: Smoke test on production**

- Open `/master/login` → login → verify overview shows
- Open `/restaurant/login` → login → verify tables grid
- Open a table link → browse menu → add to cart → checkout → pay with test card → verify success
- Verify restaurant admin updates in realtime

- [ ] **Step 6: Commit any fixes**

```bash
git add -A && git commit -m "fix: production deployment fixes" && git push
```

---

## Execution Order

| Day | Tasks | Hours |
|-----|-------|-------|
| 0 | Task 0 (prerequisites) | 2h |
| 1 | Task 1 (utilities) + Task 2 (master overview) + Task 3 (customer detail) + Task 4 (cleanup) | 8h |
| 2 | Task 5 (tables grid) + Task 6 (table detail) + Task 7 (item 86) + Task 8 (staff) | 10h |
| 3 | Task 9 (Stripe) + Task 10 (realtime) + Task 11 (guest polish) + Task 12 (review) | 10h |
| 4 | Task 13 (cleanup) + Task 14 (deploy) | 3h |

**Total: ~31 hours across 4-5 days**
