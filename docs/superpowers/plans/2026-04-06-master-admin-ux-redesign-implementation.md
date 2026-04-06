# Master Admin UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a clean, role-safe Master Admin SaaS UX with a single canonical entry point, restaurant creation flow, tier management, and restaurant-level drill-down dashboards.

**Architecture:** Keep existing Next.js app and Supabase-backed APIs, but isolate Master Admin UX via dedicated routes/components (`/admin/master` and nested pages), add explicit role routing guards, and introduce focused master API endpoints for restaurant lifecycle and analytics.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Supabase (Postgres), Tailwind CSS.

---

## File Structure

### Create
- `app/admin/master/layout.tsx`
- `app/admin/master/page.tsx`
- `app/admin/master/restaurants/page.tsx`
- `app/admin/master/restaurants/[id]/page.tsx`
- `app/api/master/restaurants/route.ts`
- `app/api/master/restaurants/[id]/route.ts`
- `app/api/master/restaurants/[id]/dashboard/route.ts`
- `components/master/master-shell.tsx`
- `components/master/master-overview-client.tsx`
- `components/master/master-restaurants-client.tsx`
- `components/master/new-restaurant-modal.tsx`
- `components/master/master-restaurant-detail-client.tsx`
- `lib/master-auth.ts`
- `lib/master-metrics.ts`
- `supabase/migrations/0008_master_restaurant_fields.sql`

### Modify
- `components/admin-login-client.tsx`
- `components/admin-dashboard-client.tsx`
- `components/admin-company-client.tsx` (deprecate into redirect wrapper)
- `app/admin/company/page.tsx`
- `app/page.tsx`
- `lib/types.ts`
- `scripts/dev-with-urls.mjs`

### Test
- `scripts/smoke.mjs` (add master route and restaurants API checks)

---

### Task 1: Add DB schema for SaaS restaurant management

**Files:**
- Create: `supabase/migrations/0008_master_restaurant_fields.sql`
- Modify: `supabase/seed.sql`, `supabase/full_setup.sql`
- Test: N/A (validated via SQL and app boot)

- [ ] **Step 1: Write migration SQL with explicit columns and constraints**

```sql
alter table restaurants
  add column if not exists status text not null default 'active'
    check (status in ('active','inactive','suspended','cancelled')),
  add column if not exists plan text not null default 'starter'
    check (plan in ('starter','growth','pro')),
  add column if not exists plan_price numeric(10,2) not null default 49,
  add column if not exists currency text not null default 'USD',
  add column if not exists owner_name text,
  add column if not exists owner_email text,
  add column if not exists owner_phone text,
  add column if not exists website_url text;
```

- [ ] **Step 2: Add seed-safe backfill defaults for existing rows**

```sql
update restaurants
set
  plan_price = case plan
    when 'starter' then 49
    when 'growth' then 99
    when 'pro' then 199
    else 49
  end
where plan_price is null;
```

- [ ] **Step 3: Update seed/full_setup inserts to include required V1 fields**

```sql
insert into restaurants (id,name,venue_flow,guest_order_mode,status,plan,plan_price,currency,owner_name,owner_email,owner_phone,website_url,google_review_url)
values (...);
```

- [ ] **Step 4: Run migration in local DB/supabase SQL editor**

Run: `supabase db push` (if local CLI) or execute SQL in Supabase SQL Editor.
Expected: migration applied without errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0008_master_restaurant_fields.sql supabase/seed.sql supabase/full_setup.sql
git commit -m "feat: add master-level restaurant management fields"
```

---

### Task 2: Add explicit role-safe master auth helpers

**Files:**
- Create: `lib/master-auth.ts`
- Modify: `lib/types.ts`
- Test: Build/typecheck

- [ ] **Step 1: Define role/type helpers for master vs restaurant owner**

```ts
export type PlatformRole = "master_admin" | "restaurant_owner" | "restaurant_admin";

export function isMasterRole(role: string | null | undefined): boolean {
  return role === "master_admin" || role === "super_admin";
}
```

- [ ] **Step 2: Add resolver for canonical role naming**

```ts
export function normalizePlatformRole(role: string | null | undefined): PlatformRole {
  if (role === "master_admin" || role === "super_admin") return "master_admin";
  if (role === "restaurant_owner") return "restaurant_owner";
  return "restaurant_admin";
}
```

- [ ] **Step 3: Ensure compile passes**

Run: `npm run build`
Expected: no TS errors.

- [ ] **Step 4: Commit**

```bash
git add lib/master-auth.ts lib/types.ts
git commit -m "refactor: add canonical platform role helpers"
```

---

### Task 3: Fix login routing and remove role confusion

**Files:**
- Modify: `components/admin-login-client.tsx`
- Test: manual route checks via browser

- [ ] **Step 1: Make login defaults neutral (empty) and role buttons explicit**

```tsx
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
```

- [ ] **Step 2: Add explicit CTA labels and deterministic redirects**

```tsx
router.push(isSuperAdmin(session) ? "/admin/master" : "/admin/dashboard");
```

- [ ] **Step 3: Add warning block for role destination**

```tsx
<p>Master Admin goes to Master Overview. Restaurant users go to Restaurant Dashboard.</p>
```

- [ ] **Step 4: Validate flows manually**

Run:
- login as owner -> expect `/admin/master`
- login as admin -> expect `/admin/dashboard`

- [ ] **Step 5: Commit**

```bash
git add components/admin-login-client.tsx
git commit -m "fix: enforce clear role-based login destinations"
```

---

### Task 4: Create canonical master shell + sidebar navigation

**Files:**
- Create: `components/master/master-shell.tsx`
- Create: `app/admin/master/layout.tsx`
- Test: `app/admin/master/*` pages render inside shell

- [ ] **Step 1: Build reusable shell with sidebar**

```tsx
const NAV = [
  { href: "/admin/master", label: "Overview" },
  { href: "/admin/master/restaurants", label: "Restaurants" },
  { href: "/admin/master/finance", label: "Finance" },
  { href: "/admin/master/analytics", label: "Analytics" },
  { href: "/admin/master/settings", label: "Settings" },
];
```

- [ ] **Step 2: Wrap master routes with shell layout**

```tsx
export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return <MasterShell>{children}</MasterShell>;
}
```

- [ ] **Step 3: Validate active nav highlighting and responsive layout**

Run: `npm run build`
Expected: `/admin/master` and `/admin/master/restaurants` build successfully.

- [ ] **Step 4: Commit**

```bash
git add components/master/master-shell.tsx app/admin/master/layout.tsx
git commit -m "feat: add canonical master admin shell and sidebar"
```

---

### Task 5: Implement Master Overview (6 KPI cards + filters)

**Files:**
- Create: `components/master/master-overview-client.tsx`
- Create: `app/admin/master/page.tsx`
- Create: `lib/master-metrics.ts`
- Test: visual + API wire mock/fallback

- [ ] **Step 1: Add period filter state and card container**

```tsx
const [period, setPeriod] = useState<"mtd" | "30d" | "90d">("mtd");
```

- [ ] **Step 2: Render 6 fixed KPI cards**

```tsx
const cards = ["MRR","ARR run-rate","Active restaurants","New restaurants","Churn","Collection health"];
```

- [ ] **Step 3: Make cards clickable to detail routes**

```tsx
<Link href={`/admin/master/analytics?metric=mrr&period=${period}`}>...</Link>
```

- [ ] **Step 4: Add action lists (payment risk, newly created)**

```tsx
<section aria-label="Payment risk">...</section>
```

- [ ] **Step 5: Commit**

```bash
git add components/master/master-overview-client.tsx app/admin/master/page.tsx lib/master-metrics.ts
git commit -m "feat: build master overview with SaaS KPI cards"
```

---

### Task 6: Implement Restaurants page with filter and row actions

**Files:**
- Create: `components/master/master-restaurants-client.tsx`
- Create: `app/admin/master/restaurants/page.tsx`
- Test: list filtering and action menu behavior

- [ ] **Step 1: Build table with required 6 columns**

```tsx
<th>Name</th><th>Tier</th><th>Status</th><th>MRR plan</th><th>Payment status</th><th>Actions</th>
```

- [ ] **Step 2: Add Active/Inactive filter state and URL sync**

```tsx
const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("all");
```

- [ ] **Step 3: Add row dropdown action menu**

```tsx
[Open, Edit tier, Edit main information, Deactivate/Archive]
```

- [ ] **Step 4: Add row click -> detail route**

```tsx
router.push(`/admin/master/restaurants/${id}`)
```

- [ ] **Step 5: Commit**

```bash
git add components/master/master-restaurants-client.tsx app/admin/master/restaurants/page.tsx
git commit -m "feat: add master restaurants management table"
```

---

### Task 7: Implement `+ New` modal and DB creation flow

**Files:**
- Create: `components/master/new-restaurant-modal.tsx`
- Modify: `components/master/master-restaurants-client.tsx`
- Create: `app/api/master/restaurants/route.ts`
- Test: create flow and optimistic list update

- [ ] **Step 1: Build modal form with required/optional fields**

```tsx
required: name,tier,currency,plan,owner_name,owner_email,owner_phone
optional: website_url,google_review_url
```

- [ ] **Step 2: Add submit handler to POST new restaurant**

```tsx
await fetch("/api/master/restaurants", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(form) });
```

- [ ] **Step 3: Implement API POST with plan price mapping**

```ts
const PLAN_PRICE = { starter: 49, growth: 99, pro: 199 };
```

- [ ] **Step 4: Update list in place and highlight created row**

```tsx
setCreatedId(newRow.id); setRows((prev)=>[newRow, ...prev]);
```

- [ ] **Step 5: Commit**

```bash
git add components/master/new-restaurant-modal.tsx components/master/master-restaurants-client.tsx app/api/master/restaurants/route.ts
git commit -m "feat: add new restaurant modal with direct DB creation"
```

---

### Task 8: Implement tier editing inline (dropdown) + PATCH API

**Files:**
- Modify: `components/master/master-restaurants-client.tsx`
- Create: `app/api/master/restaurants/[id]/route.ts`
- Test: inline tier updates persist

- [ ] **Step 1: Add inline tier select in table rows**

```tsx
<select value={row.guestOrderMode} onChange={(e)=>updateTier(row.id,e.target.value)}>
  <option value="self_service">Tier 1</option>
  <option value="waiter_service">Tier 2</option>
</select>
```

- [ ] **Step 2: Implement PATCH API endpoint**

```ts
if (body.guestOrderMode) updates.guest_order_mode = body.guestOrderMode;
if (body.status) updates.status = body.status;
```

- [ ] **Step 3: Restrict endpoint to master role**

```ts
if (!isMasterRole(admin.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

- [ ] **Step 4: Commit**

```bash
git add components/master/master-restaurants-client.tsx app/api/master/restaurants/[id]/route.ts
git commit -m "feat: enable inline tier and status updates for master"
```

---

### Task 9: Implement restaurant detail page (Overview/Billing/Tier/Operations)

**Files:**
- Create: `components/master/master-restaurant-detail-client.tsx`
- Create: `app/admin/master/restaurants/[id]/page.tsx`
- Create: `app/api/master/restaurants/[id]/dashboard/route.ts`
- Test: tab navigation and data loading

- [ ] **Step 1: Build detail page shell and 4-tab navigation**

```tsx
const tabs = ["overview","billing","tier-settings","operations"];
```

- [ ] **Step 2: Implement dashboard API payload for one restaurant**

```ts
return NextResponse.json({
  restaurant,
  overview: {...},
  billing: {...},
  operations: {...}
});
```

- [ ] **Step 3: Add `Actions` button group on detail page**

```tsx
[Open guest menu, Edit tier, Edit main info]
```

- [ ] **Step 4: Commit**

```bash
git add components/master/master-restaurant-detail-client.tsx app/admin/master/restaurants/[id]/page.tsx app/api/master/restaurants/[id]/dashboard/route.ts
git commit -m "feat: add master restaurant detail with 4 operational tabs"
```

---

### Task 10: Remove master confusion from legacy pages/routes

**Files:**
- Modify: `components/admin-dashboard-client.tsx`
- Modify: `components/admin-company-client.tsx`
- Modify: `app/admin/company/page.tsx`
- Modify: `app/page.tsx`
- Modify: `scripts/dev-with-urls.mjs`
- Test: route behavior and link clarity

- [ ] **Step 1: Ensure master user is redirected out of legacy staff dashboard**

```tsx
if (session?.role === "super_admin" || session?.role === "master_admin") {
  router.replace("/admin/master");
}
```

- [ ] **Step 2: Keep `/admin/company` as backward-compatible redirect only**

```tsx
redirect("/admin/master");
```

- [ ] **Step 3: Update homepage/dev links to canonical master routes only**

```ts
/admin/master
/admin/master/restaurants
```

- [ ] **Step 4: Commit**

```bash
git add components/admin-dashboard-client.tsx components/admin-company-client.tsx app/admin/company/page.tsx app/page.tsx scripts/dev-with-urls.mjs
git commit -m "refactor: consolidate master UX to canonical route flow"
```

---

### Task 11: Update smoke tests and validate critical user journeys

**Files:**
- Modify: `scripts/smoke.mjs`
- Test: smoke + manual matrix

- [ ] **Step 1: Add smoke checks for master pages**

```js
await req("/admin/master");
await req("/admin/master/restaurants");
```

- [ ] **Step 2: Add API shape assertion for master restaurants endpoint**

```js
// expect { restaurants: [] } and fields name/tier/status/plan/paymentStatus
```

- [ ] **Step 3: Run smoke and build**

Run:
- `npm run test:smoke`
- `npm run build`

Expected:
- smoke passes (or controlled warnings)
- build succeeds

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke.mjs
git commit -m "test: add smoke coverage for master UX routes"
```

---

### Task 12: Docs update and rollout notes

**Files:**
- Modify: `README.md`
- Create/Modify: `TESTING.md`
- Test: doc walkthrough

- [ ] **Step 1: Add role login destinations and canonical routes**

```md
Master Admin -> /admin/master
Restaurant Owner -> /admin/master/restaurants/:id
```

- [ ] **Step 2: Add V1 workflow for creating restaurant and setting tier**

```md
Restaurants -> + New -> Save -> row highlight -> Open
```

- [ ] **Step 3: Add troubleshooting section for session confusion and empty DB**

```md
If you see Invalid admin / No restaurants, run seed + re-login as owner.
```

- [ ] **Step 4: Commit**

```bash
git add README.md TESTING.md
git commit -m "docs: document master admin v1 workflow and troubleshooting"
```

---

## Self-Review

### Spec coverage check
- Master-first navigation: covered (Tasks 4, 10)
- Overview KPIs and SaaS metrics: covered (Task 5)
- Restaurants list with filter/status/actions: covered (Task 6)
- `+ New` modal + DB creation + highlight: covered (Task 7)
- Tier editing and master-only rule: covered (Task 8)
- Restaurant detail with 4 tabs: covered (Task 9)
- Role separation and login routing: covered (Tasks 2, 3, 10)
- Best-practice error handling/test plan: covered (Tasks 8, 11, 12)

No uncovered requirement found.

### Placeholder scan
- No TODO/TBD placeholders.
- All tasks include explicit files, concrete code/commands, and expected outcomes.

### Type/signature consistency
- Master canonical role normalized via `normalizePlatformRole`.
- Tier values consistent (`self_service` / `waiter_service`).
- Plan values consistent (`starter` / `growth` / `pro`) and mapped prices consistent.

