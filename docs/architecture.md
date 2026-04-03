# Zilo MVP Architecture (Phase 1-2)

## Folder Structure

- `app/`: Next.js App Router pages
  - `app/table/[id]/`: table-specific customer journey
  - `app/table/[id]/menu/`: menu browsing
  - `app/table/[id]/cart/`: cart management
- `components/`: reusable UI components (`menu-client`, `cart-client`)
- `lib/`: shared types, sample seed data, cart state context
- `supabase/migrations/`: SQL schema migrations
- `supabase/seed.sql`: initial sample data
- `docs/`: architecture and planning notes

## Why this setup

- Mobile-first App Router keeps customer flow fast and route-driven.
- Table id in URL (`/table/:id`) directly supports QR entry points.
- Cart state is table-scoped in localStorage for low complexity MVP behavior.
- Supabase schema supports card + cash tracking and future split-item payments.
