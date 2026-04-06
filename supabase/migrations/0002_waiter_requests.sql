-- Waiter call signals from QR table guests (MVP).

create type waiter_request_status as enum ('open', 'dismissed');

create table if not exists waiter_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id uuid not null references restaurant_tables(id) on delete cascade,
  status waiter_request_status not null default 'open',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_waiter_requests_restaurant on waiter_requests(restaurant_id);
create index if not exists idx_waiter_requests_status_created on waiter_requests(status, created_at desc);

alter table waiter_requests enable row level security;
create policy "anon_all" on waiter_requests for all using (true) with check (true);

-- Supabase Realtime: ignore error if the table is already in `supabase_realtime`
-- (e.g. re-run migration). In Dashboard: Database → Replication, enable `waiter_requests` if needed.
alter publication supabase_realtime add table waiter_requests;
