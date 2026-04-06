alter table restaurants
  add column if not exists venue_flow text not null default 'dine_in'
  check (venue_flow in ('dine_in', 'pay_first'));
