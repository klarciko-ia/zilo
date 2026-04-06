# Zilo MVP — Master Console & Restaurant Admin Design

## Context

Zilo is a SaaS ordering & payment platform for restaurants. Guests scan a link, browse the menu, order, and pay (including split payments) from their phone. The platform serves three user types: the SaaS owner (Master Admin), restaurant owners, and restaurant staff (servers).

**MVP scope:** 2-3 test restaurants (friends/contacts), free for 3 months, deployed on Vercel. The goal is a polished demo for investors plus real-world testing. International from day one (Bali, Morocco, anywhere).

**Timeline:** 3-4 days.

**Approach:** Clean Slate — rebuild both console frontends from scratch, keep existing backend/API layer and adapt it.

---

## 1. Master Console (CRM)

### Purpose

The Master Console is a CRM for managing restaurant clients. It is NOT an operations dashboard. The user (Yassine) manages client acquisition, monitors adoption, and tracks billing.

### Users

Only `super_admin` role. Single user at launch.

### Layout

- Sidebar: dark (#062946), collapsible on mobile
- Content area: beige (#faf4ed)
- Responsive: works on desktop and laptop

### Sidebar Navigation (3 items)

- **Overview** (home)
- **Customers** (client list — same content as overview table, dedicated page for filtered views)
- **Logout**

No Analytics, Finance, or Settings pages. Cut for MVP.

### Page 1: Overview

**Top — 4 KPI Cards:**

| Card | Data | Source |
|------|------|--------|
| Restaurants actifs | Count where status = active | DB/demo-store |
| Nouveaux ce mois | Count created in last 30 days | createdAt field |
| MRR | Sum of planPrice for all active restaurants | DB/demo-store |
| Impayés | Count where paymentStatus = overdue | DB/demo-store |

**Middle — Client List (compact table):**

Columns: Name, Tier (1 or 2), Status badge, MRR amount, Last activity (relative time). Click a row to open Customer Detail. "Add Customer" button top-right. Search bar. Status filter tabs (All / Active / Inactive).

**Bottom — Activity Feed:**

5-10 most recent events across all restaurants:
- "7AM — 12 orders today"
- "Open House — cash payment pending"
- "Casadior — inactive for 3 days"

Data sourced from aggregated order/payment records.

### Page 2: Customer Detail

Single scrollable page, no tabs.

**Header:** Restaurant name + tier badge + status badge + "Open Guest Menu" button (opens in new tab with table selector).

**Section: Info**
- Owner email, plan, price, currency, date created, number of tables

**Section: Activity**
- Total orders (all time), total revenue generated, last order date

**Section: Actions**
- Change tier (dropdown: Tier 1 / Tier 2)
- Deactivate client (button)

---

## 2. Restaurant Admin

### Purpose

The tool restaurant owners and servers use daily. Focused on: seeing orders per table, confirming orders, processing payments. No kitchen management — Zilo integrates with the restaurant's existing POS/kitchen workflow.

### Users

Two roles on the same interface with different visibility:

| Capability | restaurant_owner | restaurant_staff |
|------------|-----------------|------------------|
| See tables + orders | Yes | Yes |
| Receive new order notifications | Yes | Yes |
| Confirm orders | Yes | Yes |
| Confirm cash payments | Yes | Yes |
| See daily revenue | Yes | No |
| See business metrics | Yes | No |
| Create staff accounts | Yes | No |

### Layout

- Top bar: restaurant name (left), logout (right)
- No sidebar — mobile-first (servers use their phone standing up)
- Touch-friendly buttons and cards

### Owner-only Banner

A small stats banner visible only to `restaurant_owner`:
- Revenue today
- Orders today
- Pending cash payments

Servers do not see this banner.

### Main View: Tables Grid

Grid of cards, one per table. Each card shows:
- Table number
- Status: **free** / **ordering** / **confirmed** / **awaiting payment**
- Order amount (if applicable)
- Time since order was placed

Color-coded status:
- Free = grey
- Ordering = blue (guest is building an order)
- Confirmed = green (server confirmed, sent to kitchen/POS)
- Awaiting payment = orange
- Paid (briefly) = green flash then back to free

### Table Detail (tap a table card)

Shows:
- All items ordered, with quantities and prices
- Order total
- Order status
- Action buttons based on status:
  - If "ordering" → "Confirm Order" button (server validates the order)
  - If "confirmed" → status display (order is with kitchen/POS)
  - If "awaiting payment" → "Confirm Cash" button OR "Already paid via card" indicator
  - If "paid" → "Clear Table" button

### Notifications

Supabase Realtime subscription. When a guest places an order or requests service:
- The server's phone vibrates (if browser supports it)
- The affected table card shows a pulsing badge
- A toast notification appears briefly

---

## 3. Order Lifecycle

### Statuses

```
pending → confirmed → awaiting_payment → paid
                                       ↗
                        pending_cash → (staff confirms) → paid
```

- **pending**: Guest has submitted an order through Zilo
- **confirmed**: Server has reviewed and confirmed the order (it goes to kitchen/POS manually)
- **awaiting_payment**: Order is served, guest is ready to pay
- **pending_cash**: Guest chose cash payment, waiting for server to confirm receipt
- **paid**: Payment complete (card via Stripe or cash confirmed)

### Table Statuses

Derived from orders:
- **free**: No active order
- **ordering**: Guest has submitted an order that the server hasn't confirmed yet (DB status = pending). Note: while the guest is still browsing/adding items, no DB record exists — the table appears as "free" to the server until the guest submits.
- **confirmed**: Active confirmed order
- **awaiting_payment**: Order served, awaiting payment
- After payment → automatically returns to **free**

---

## 4. Payment Architecture

### Abstraction Layer

A provider-agnostic payment API:

```
POST /api/payments/charge
  → body: { orderId, amount, currency, method: "card" | "cash" }
  → if card: detectProvider() → Stripe (MVP) | CMI (future) | ...
  → create checkout session → return redirect URL
  → guest completes payment on provider's form
  → webhook confirms → update order status to "paid"
  → if cash: set order to "pending_cash" → server confirms manually
```

### Stripe Integration (MVP)

- **Mode:** Test mode for demo and initial testing. Live mode when ready.
- **Architecture:** Stripe Connect — platform account (Zilo) + connected accounts (each restaurant).
- **Checkout:** Stripe Checkout (hosted page) — minimal frontend work, PCI compliant out of the box.
- **Webhook:** `/api/payments/webhook` listens for `checkout.session.completed`.

### Split Payments

Zilo's killer feature. Options available to the guest:
- **Pay full amount** — one person pays everything
- **Split by percentage** — e.g., 50/50, 60/40
- **Split by items** — each person selects which items they ordered

Each split creates a separate payment record. The order tracks `amount_paid` vs `total_amount`. Order moves to "paid" only when `amount_paid >= total_amount`.

### Future: CMI (Morocco)

Same `/api/payments/charge` endpoint. The `detectProvider()` function checks restaurant country/config and routes to CMI instead of Stripe. Frontend unchanged.

---

## 5. Roles & Auth

### Database: admin_users table

Add `restaurant_staff` to the role check constraint:

```sql
role CHECK (role IN ('super_admin', 'restaurant_owner', 'restaurant_staff'))
```

### Login Flow

- `/master/login` → only allows `super_admin` → redirects to `/admin/master`
- `/restaurant/login` → allows `restaurant_owner` and `restaurant_staff` → redirects to `/admin/restaurant`

### Session

MVP: localStorage-based session (existing pattern). Contains: id, email, role, restaurantId.

Staff accounts are scoped to a single restaurant via `restaurant_id` foreign key.

### Staff Account Creation

Restaurant owner can create staff logins from the Restaurant Admin. Simple form: name + email + password. Created with role `restaurant_staff` and the same `restaurant_id`.

---

## 6. What We Keep / Jettison / Build

### Keep
- Supabase schema (restaurants, restaurant_tables, table_orders, order_items, payments, reviews, admin_users)
- API routes for payments, orders (adapted for new lifecycle)
- Guest flow (menu browse, cart, checkout) — polished
- Demo-store system for local dev
- Login system (extended with restaurant_staff role)

### Jettison
- Master Console frontend (complete rebuild)
- Restaurant Admin frontend (complete rebuild, no KDS)
- Placeholder pages (Analytics, Finance, Settings)
- Complex demo fallbacks in API routes
- Monolithic components (300+ line files)

### Build

| Component | Estimated Effort |
|-----------|-----------------|
| Master Console — Overview + Customer Detail | ~4h |
| Restaurant Admin — Tables grid + Order detail + Cash confirm | ~6h |
| `restaurant_staff` role with restricted views | ~2h |
| Stripe test mode (Checkout + webhook) | ~4h |
| Order lifecycle (pending → confirmed → paid) | ~3h |
| Realtime notifications (Supabase Realtime) | ~2h |
| Guest flow polish (clean UI, restaurant name, split payment UX) | ~3h |
| Deploy to Vercel + Supabase cloud | ~2h |

**Total: ~26 hours / 3-4 focused days**

---

## 7. Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend framework | Next.js 14 (keep) | Already in place, App Router works well |
| Styling | Tailwind (keep) | Already in place, fast iteration |
| Database | Supabase Postgres (keep) | Schema exists, Realtime built-in |
| Payments | Stripe Checkout (test mode) | Fastest to integrate, works globally, PCI-free |
| Hosting | Vercel | Free tier, instant deploy, works with Next.js |
| Icons | lucide-react (keep) | Already installed |
| Realtime | Supabase Realtime (keep) | Already configured for some tables |
| Auth | localStorage sessions (keep for MVP) | Exists, works. Proper auth (cookies/JWT) is v2. |
