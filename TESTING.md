# Testing before a real pilot

Use this **before** you rely on Zilo during service. Nothing here replaces a **one-table trial** with a friend, but it catches broken envs and routing early.

## Guest URL flow (dine-in, venue type default)

1. `**/table/{qr_slug}`** — Landing: **Menu** + **Bill, pay & review** (hub).
2. `**/table/{qr_slug}/menu`** — **Tier 1 (self-order):** add to cart → **Review order** in the bottom bar. **Tier 2 (waiter):** browse-only menu + **Call waiter**; bottom bar links to hub (no cart).
3. `**/table/{qr_slug}/order-review`** — Tier 1 only: line items & upsells; **Confirm** → hub. Tier 2 redirects to hub.
4. `**/table/{qr_slug}/hub`** — **View bill / Pay** (split & tips in checkout), **Rate your visit** when the bill is fully paid, **Menu** / **Add more**, **Send to kitchen** (Tier 1 only).

**Tiers:** Admin **Dashboard** → **Guest ordering mode** — Tier 1 self-order vs Tier 2 waiter (menu browse only; staff/POS adds the bill). Requires DB column `guest_order_mode` (see `supabase/migrations/0005_guest_order_mode.sql` or `supabase/sql/reapply_guest_order_mode.sql`).

Example Tier 1: `/table/1` → `/table/1/menu` → `/table/1/order-review` → `/table/1/hub` → `/table/1/checkout`.

Example Tier 2: `/table/1` → `/table/1/hub` or `/table/1/menu` (browse) → `/table/1/checkout` when a bill exists on the server.

## localStorage (testers)

If totals or carts look wrong after schema or demo changes, reset in the browser devtools console:

```js
localStorage.removeItem("zilo_cart_map_v1");
localStorage.removeItem("zilo_order_map_v1");
```

Then reload. Cart lines are keyed by table id inside `zilo_cart_map_v1`.

## 1. Automated smoke (fast)

1. Start the app: `npm run dev` (note the **port** in the terminal).
  **Shortcut:** `npm run dev:all` prints admin / kitchen / table links when the server is ready.  
   Auto-open tabs (macOS/Linux): `ZILO_OPEN=1 npm run dev:all`
2. In another terminal:

```bash
BASE_URL=http://127.0.0.1:3000 npm run test:smoke
```

Use the same **host and port** as step 1 (e.g. `http://127.0.0.1:3001` if 3000 is busy).

- **FAIL** — fix before demos (server down, broken routes, bad responses).
- **WARN** — often missing Supabase env or no `qr_slug=1` table in DB; order APIs may not work until that’s fixed.
- To treat warnings as failures (e.g. CI): `SMOKE_STRICT=1 BASE_URL=... npm run test:smoke`

## 2. Manual happy path (phone or browser)

Use **one base URL** the whole time (same host **and** port so admin `localStorage` matches).


| Step | Action                                                | Expect                                                          |
| ---- | ----------------------------------------------------- | --------------------------------------------------------------- |
| 1    | Open `/table/1`                                       | Landing with **Menu**                                           |
| 2    | Open **Menu**, add items                              | Cart / bottom bar updates                                       |
| 3    | Tap **Review order**                                  | `/table/1/order-review` lists lines                             |
| 4    | Change qty, optional **Often enjoyed together** → Add | Cart updates                                                    |
| 5    | **Confirm**                                           | `/table/1/hub` with three actions                               |
| 6    | **Send to kitchen** (with items in cart)              | Success or clear error; ticket on `/admin/kitchen`; cart clears |
| 7    | **Add more items** → menu → send again                | Second kitchen round merges server-side                         |
| 8    | **View bill / Pay**                                   | `/table/1/checkout`                                             |
| 9    | Admin: `/admin/login` then `/admin/kitchen`           | Sees tickets if kitchen path used                               |


## 3. Second device / incognito

Repeat step 2 on another profile: carts should stay **per device** unless you intentionally share behavior later.

## 4. Failure checks

- Turn off Wi‑Fi mid-request: user should see an error, not a silent wrong total.
- Refresh on **order-review**, **hub**, and **checkout**: cart in `localStorage` should still match expectations.

## 5. When you’re “ready for one real table”

- Smoke passes **twice in a row** with **no unexpected FAIL**.
- Manual path completed **once** on a **real phone**.
- Staff knows a **fallback** (paper / manual bill) if QR fails.

Then book **one table, one meal**, not a full Saturday as the first test.