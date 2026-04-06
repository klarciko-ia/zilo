-- Run in Supabase SQL editor if migration 0005 was not applied yet.
alter table restaurants
  add column if not exists guest_order_mode text not null default 'self_service'
  check (guest_order_mode in ('self_service', 'waiter_service'));
