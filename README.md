# Zilo - QR Restaurant MVP

Mobile-first restaurant menu, cart, and payment MVP for cash-heavy markets.

## Run locally

1. Install Node.js 20+.
2. Install dependencies:
   - `npm install`
3. Copy env:
   - `cp .env.example .env.local`
4. Start app:
   - `npm run dev`

## Current implementation

- Phase 1 setup done (Next.js structure, Tailwind, Supabase schema/seed files).
- Phase 2 initial flow done:
  - `/table/[id]`
  - `/table/[id]/menu`
  - `/table/[id]/cart`
- Phase 3 done:
  - full, percentage, and item-based partial payment flows
  - card simulation and cash pending
- Phase 4 done:
  - admin login
  - dashboard table statuses
  - cash confirmation
  - internal feedback list
- Phase 5 done:
  - post-payment review funnel
  - high rating redirect to Google review link
  - low rating internal feedback capture

## Admin demo credentials (MVP only)

- Email: `admin@zilo.ma`
- Password: `admin123`

## Supabase files

- Schema migration: `supabase/migrations/0001_init.sql`
- Seed file: `supabase/seed.sql`
