# Master Admin UX Redesign (SaaS Restaurant)

## Context

Current admin UX is confusing due to mixed role entry points, duplicated paths, and operational (restaurant-level) screens shown in company-owner flows. The objective is to deliver a clear, SaaS-style experience centered on a `master_admin` who manages multiple restaurants, with explicit role separation from restaurant owners and staff.

This redesign keeps core data/API foundations and replaces the interaction model with a simple, role-first information architecture.

## Product Goals

1. Make the platform understandable in under 30 seconds for Master Admin users.
2. Remove ambiguity between company-level and restaurant-level dashboards.
3. Enable fast restaurant lifecycle actions: create, configure tier, open details.
4. Surface SaaS business KPIs (MRR/churn/collections), not only restaurant operations.
5. Keep V1 compact and actionable; defer non-essential modules.

## User Roles (V1)

- `master_admin`: platform/company owner (multi-restaurant governance).
- `restaurant_owner`: owner of one restaurant (single-restaurant view).
- `restaurant_admin`: staff operational role (out of primary V1 scope).

### Permission principles

- Only `master_admin` can change restaurant tier.
- `restaurant_owner` cannot change tier.
- Each role has one primary landing flow.

## IA and Navigation

### Master navigation (sidebar)

1. Overview
2. Restaurants
3. Finance
4. Analytics
5. Settings

### Routing rules

- Master login lands on Master Overview.
- Any accidental access to staff/legacy screens by Master redirects to Master Overview.
- Keep one canonical master entry point; avoid duplicate “owner home” aliases in user-facing nav.

## Screen Design

## 1) Master Overview

### Header

- Title: `Master Admin`
- Global period filter: `MTD | 30d | 90d`
- Last updated timestamp

### KPI cards (6, fixed)

1. MRR
2. ARR run-rate
3. Active restaurants
4. New restaurants (selected period)
5. Churn (selected period)
6. Collection health (`Overdue amount + % MRR at risk`)

### Action zones

- Payment risk list (restaurants overdue)
- Recently created restaurants
- Quick links to Restaurants and Finance

### Card click behavior

- Click opens a filtered detail page (not a modal/drawer).

## 2) Restaurants (core management screen)

### Top bar

- Title: `Restaurants`
- Count badge (`N restaurants`)
- Filter: `Active / Inactive`
- Primary CTA: `+ New`

### Table columns (V1)

1. Name
2. Tier
3. Status
4. MRR plan
5. Payment status
6. Actions

### Row actions menu

- Open
- Edit tier
- Edit main information
- Deactivate/Archive

### Restaurant row click

- Opens dedicated restaurant page (`/admin/master/restaurants/:id`).

## 3) Create Restaurant Modal (`+ New`)

### Required fields

- Restaurant name
- Tier (`Tier 1` / `Tier 2`)
- Currency
- Plan (`Starter/Growth/Pro`)
- Owner full name
- Owner email
- Owner phone

### Optional fields

- Website URL
- Google Review URL

### Plan defaults

- Starter: $49
- Growth: $99
- Pro: $199

### Success behavior

- Stay on list
- Show success toast
- Highlight newly created row
- Keep `Open` action available immediately

## 4) Restaurant Detail (dedicated page)

### V1 tabs

- Overview
- Billing
- Tier & Settings
- Operations

### Intent

- Give Master Admin or restaurant owner contextual control/KPIs for one venue.

## Data Model (V1 additions/standardization)

Restaurant entity should support:

- `id`
- `name`
- `status` (`active|inactive|suspended|cancelled`)
- `tier` (`self_service|waiter_service`)
- `currency`
- `plan` (`starter|growth|pro`)
- `plan_price`
- `owner_name`
- `owner_email`
- `owner_phone`
- `website_url` (nullable)
- `google_review_url` (nullable)
- `created_at`, `updated_at`

## API Contract (V1)

- `GET /api/master/restaurants` (filters: status/search/plan)
- `POST /api/master/restaurants`
- `PATCH /api/master/restaurants/:id`
- `GET /api/master/restaurants/:id/dashboard`

## Error Handling UX

- `Invalid admin` -> "Session expired, please sign in again."
- Empty state -> "No restaurants yet" + `Create your first restaurant`
- Save failure -> inline error + retry action
- Network failure -> banner + retry

## Non-Goals (V1)

- Full integrations marketplace
- Complex team permission matrix
- Advanced custom dashboards per user
- Rebuilding guest checkout and payment flows from scratch

## Best-Practice Decisions Applied

1. Role-based landing separation (prevents mode confusion).
2. One canonical primary path per role.
3. Progressive disclosure: top KPIs first, deep details on click.
4. Action-heavy table for entity management.
5. Keep V1 focused; postpone lower-value modules.

## Test Plan (V1 acceptance)

1. Master login routes to Master Overview.
2. Restaurant owner login routes to restaurant-scoped view.
3. Create restaurant from modal inserts DB row and appears in list.
4. Active/Inactive filter works and reflects cancellations.
5. Tier edit persists and updates table state.
6. Payment status column renders and filters/sorts correctly.
7. Row actions open/edit/deactivate function correctly.
8. KPI card click opens filtered detail page.
9. No redirect loops to legacy staff dashboard for master users.
10. Empty/error states are user-readable and actionable.

## Rollout Strategy

1. Implement behind role-based routing and hide legacy master paths.
2. Move existing Master users to new Overview and Restaurants first.
3. Keep old operational pages accessible only where still needed.
4. Measure support tickets/confusion feedback after release.