-- ============================================
-- FULL SETUP: Drop everything, recreate, seed
-- Run this ONCE in a clean Supabase SQL editor
-- ============================================

-- 1. Drop tables
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS kitchen_order_items CASCADE;
DROP TABLE IF EXISTS kitchen_orders CASCADE;
DROP TABLE IF EXISTS waiter_requests CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS table_orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS restaurant_tables CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;

-- 2. Drop types
DROP TYPE IF EXISTS table_order_status CASCADE;
DROP TYPE IF EXISTS payment_type CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS waiter_request_status CASCADE;
DROP TYPE IF EXISTS kitchen_order_status CASCADE;

-- 3. Create tables and types
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  google_review_url text not null,
  venue_flow text not null default 'dine_in' check (venue_flow in ('dine_in', 'pay_first')),
  guest_order_mode text not null default 'self_service' check (guest_order_mode in ('self_service', 'waiter_service')),
  created_at timestamptz not null default now()
);

create table restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_number int not null,
  qr_slug text not null unique,
  created_at timestamptz not null default now(),
  unique (restaurant_id, table_number)
);

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid not null references menu_categories(id) on delete restrict,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create type table_order_status as enum ('unpaid', 'partially_paid', 'pending_cash', 'paid');
create type payment_type as enum ('full', 'percentage_partial', 'item_partial');
create type payment_method as enum ('card', 'cash');
create type payment_status as enum ('pending', 'completed', 'failed', 'pending_cash_confirm');

create table table_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id uuid not null references restaurant_tables(id) on delete cascade,
  status table_order_status not null default 'unpaid',
  total_amount numeric(10,2) not null default 0,
  amount_paid numeric(10,2) not null default 0,
  amount_cash_pending numeric(10,2) not null default 0,
  remaining_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references table_orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity_total int not null check (quantity_total > 0),
  quantity_paid int not null default 0 check (quantity_paid >= 0),
  quantity_remaining int not null check (quantity_remaining >= 0),
  total_price numeric(10,2) not null default 0
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references table_orders(id) on delete cascade,
  payment_type payment_type not null,
  payment_method payment_method not null,
  amount numeric(10,2) not null check (amount > 0),
  status payment_status not null default 'pending',
  external_reference text,
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid references table_orders(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  feedback_text text,
  redirected_to_google boolean not null default false,
  created_at timestamptz not null default now()
);

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  role text not null default 'restaurant_admin' check (role in ('super_admin', 'restaurant_admin')),
  created_at timestamptz not null default now(),
  constraint admin_users_role_scope_chk check (
    (role = 'super_admin')
    or (role = 'restaurant_admin' and restaurant_id is not null)
  )
);

create type waiter_request_status as enum ('open', 'dismissed');

create table waiter_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id uuid not null references restaurant_tables(id) on delete cascade,
  status waiter_request_status not null default 'open',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type kitchen_order_status as enum ('new', 'preparing', 'ready', 'done');

create table kitchen_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id uuid not null references restaurant_tables(id) on delete cascade,
  status kitchen_order_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table kitchen_order_items (
  id uuid primary key default gen_random_uuid(),
  kitchen_order_id uuid not null references kitchen_orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity int not null check (quantity > 0)
);

-- 4. Indexes
create index idx_restaurant_tables_restaurant on restaurant_tables(restaurant_id);
create index idx_menu_items_restaurant on menu_items(restaurant_id);
create index idx_menu_items_category on menu_items(category_id);
create index idx_orders_table on table_orders(table_id);
create index idx_order_items_order on order_items(order_id);
create index idx_payments_order on payments(order_id);
create index idx_reviews_restaurant on reviews(restaurant_id);
create index idx_waiter_requests_restaurant on waiter_requests(restaurant_id);
create index idx_waiter_requests_status_created on waiter_requests(status, created_at desc);
create index idx_kitchen_orders_restaurant on kitchen_orders(restaurant_id);
create index idx_kitchen_orders_status on kitchen_orders(status, created_at desc);
create index idx_kitchen_order_items_order on kitchen_order_items(kitchen_order_id);

-- 5. RPC function for item-based splits
create or replace function increment_order_item_paid(
  p_order_item_id uuid,
  p_quantity int
) returns void as $$
begin
  update order_items
  set
    quantity_paid = quantity_paid + p_quantity,
    quantity_remaining = quantity_remaining - p_quantity
  where id = p_order_item_id;
end;
$$ language plpgsql;

create or replace function resolve_menu_item_fk(p_raw text)
returns uuid
language plpgsql
stable
as $$
declare
  v uuid;
begin
  if p_raw is null or btrim(p_raw) = '' then
    return null;
  end if;
  begin
    v := p_raw::uuid;
  exception
    when invalid_text_representation then
      return null;
  end;
  return (select mi.id from menu_items mi where mi.id = v limit 1);
end;
$$;

grant execute on function resolve_menu_item_fk(text) to anon, authenticated, service_role;

-- Kitchen ticket + bill merge (single transaction via RPC)
create or replace function submit_kitchen_ticket(p_qr_slug text, p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_table_id uuid;
  v_restaurant_id uuid;
  v_kitchen_id uuid;
  v_order_id uuid;
  el jsonb;
  v_line_qty int;
  v_line_price numeric;
  v_line_name text;
  v_line_menu_id uuid;
  v_line_total numeric;
  v_added_total numeric := 0;
  oi record;
begin
  select id, restaurant_id into v_table_id, v_restaurant_id
  from restaurant_tables where qr_slug = p_qr_slug;
  if v_table_id is null then
    return jsonb_build_object('error', 'TABLE_NOT_FOUND');
  end if;

  if p_items is null or jsonb_array_length(p_items) < 1 then
    return jsonb_build_object('error', 'ITEMS_REQUIRED');
  end if;

  for el in select * from jsonb_array_elements(p_items)
  loop
    if (el->>'menuItemId') is null or (el->>'name') is null
       or (el->>'unitPrice') is null or (el->>'quantity') is null then
      return jsonb_build_object('error', 'INVALID_ITEM');
    end if;
    v_line_price := (el->>'unitPrice')::numeric;
    v_line_qty := (el->>'quantity')::int;
    if v_line_qty < 1 then
      return jsonb_build_object('error', 'INVALID_QUANTITY');
    end if;
    v_added_total := v_added_total + (v_line_price * v_line_qty);
  end loop;

  insert into kitchen_orders (restaurant_id, table_id, status)
  values (v_restaurant_id, v_table_id, 'new')
  returning id into v_kitchen_id;

  for el in select * from jsonb_array_elements(p_items)
  loop
    v_line_menu_id := resolve_menu_item_fk(el->>'menuItemId');
    v_line_name := el->>'name';
    v_line_price := (el->>'unitPrice')::numeric;
    v_line_qty := (el->>'quantity')::int;
    v_line_total := v_line_price * v_line_qty;

    insert into kitchen_order_items (kitchen_order_id, menu_item_id, name, unit_price, quantity)
    values (v_kitchen_id, v_line_menu_id, v_line_name, v_line_price, v_line_qty);
  end loop;

  select id into v_order_id
  from table_orders
  where table_id = v_table_id and status <> 'paid'::table_order_status
  order by created_at desc
  limit 1;

  if v_order_id is null then
    insert into table_orders (restaurant_id, table_id, status, total_amount, amount_paid, amount_cash_pending, remaining_amount)
    values (v_restaurant_id, v_table_id, 'unpaid', v_added_total, 0, 0, v_added_total)
    returning id into v_order_id;

    for el in select * from jsonb_array_elements(p_items)
    loop
      v_line_menu_id := resolve_menu_item_fk(el->>'menuItemId');
      v_line_name := el->>'name';
      v_line_price := (el->>'unitPrice')::numeric;
      v_line_qty := (el->>'quantity')::int;
      v_line_total := v_line_price * v_line_qty;

      insert into order_items (order_id, menu_item_id, name, unit_price, quantity_total, quantity_paid, quantity_remaining, total_price)
      values (v_order_id, v_line_menu_id, v_line_name, v_line_price, v_line_qty, 0, v_line_qty, v_line_total);
    end loop;
  else
    for el in select * from jsonb_array_elements(p_items)
    loop
      v_line_menu_id := resolve_menu_item_fk(el->>'menuItemId');
      v_line_name := el->>'name';
      v_line_price := (el->>'unitPrice')::numeric;
      v_line_qty := (el->>'quantity')::int;
      v_line_total := v_line_price * v_line_qty;

      if v_line_menu_id is null then
        insert into order_items (order_id, menu_item_id, name, unit_price, quantity_total, quantity_paid, quantity_remaining, total_price)
        values (v_order_id, null, v_line_name, v_line_price, v_line_qty, 0, v_line_qty, v_line_total);
      else
        select * into oi from order_items
        where order_id = v_order_id and menu_item_id = v_line_menu_id
        limit 1;

        if not found then
          insert into order_items (order_id, menu_item_id, name, unit_price, quantity_total, quantity_paid, quantity_remaining, total_price)
          values (v_order_id, v_line_menu_id, v_line_name, v_line_price, v_line_qty, 0, v_line_qty, v_line_total);
        else
          update order_items set
            quantity_total = quantity_total + v_line_qty,
            quantity_remaining = quantity_remaining + v_line_qty,
            total_price = total_price + v_line_total
          where id = oi.id;
        end if;
      end if;
    end loop;

    update table_orders set
      total_amount = total_amount + v_added_total,
      remaining_amount = remaining_amount + v_added_total,
      updated_at = now()
    where id = v_order_id;
  end if;

  return jsonb_build_object(
    'kitchenOrderId', v_kitchen_id,
    'tableOrderId', v_order_id
  );
end;
$$;

grant execute on function submit_kitchen_ticket(text, jsonb) to anon, authenticated, service_role;

-- 6. Seed data
insert into restaurants (id, name, google_review_url, venue_flow, guest_order_mode)
values
  ('11111111-1111-1111-1111-111111111111', 'Zilo Cafe', 'https://g.page/r/example-review-link', 'dine_in', 'self_service'),
  ('11111111-1111-1111-1111-111111111112', '7AM', 'https://g.page/r/example-review-link', 'dine_in', 'self_service'),
  ('11111111-1111-1111-1111-111111111113', 'Open House', 'https://g.page/r/example-review-link', 'dine_in', 'waiter_service');

insert into restaurant_tables (id, restaurant_id, table_number, qr_slug)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 1, '1'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2, '2'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 3, '3'),
  ('22222222-2222-2222-2222-222222223001', '11111111-1111-1111-1111-111111111112', 1, '7am-1'),
  ('22222222-2222-2222-2222-222222223002', '11111111-1111-1111-1111-111111111112', 2, '7am-2'),
  ('22222222-2222-2222-2222-222222223011', '11111111-1111-1111-1111-111111111113', 1, 'openhouse-1'),
  ('22222222-2222-2222-2222-222222223012', '11111111-1111-1111-1111-111111111113', 2, 'openhouse-2');

insert into menu_categories (id, restaurant_id, name, sort_order)
values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Drinks', 1),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Food', 2),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Desserts', 3),
  ('33333333-3333-3333-3333-33333334a101', '11111111-1111-1111-1111-111111111112', 'Coffee & drinks', 1),
  ('33333333-3333-3333-3333-33333334a102', '11111111-1111-1111-1111-111111111112', 'Breakfast', 2),
  ('33333333-3333-3333-3333-33333334b101', '11111111-1111-1111-1111-111111111113', 'Bar', 1),
  ('33333333-3333-3333-3333-33333334b102', '11111111-1111-1111-1111-111111111113', 'Small plates', 2);

insert into menu_items (id, restaurant_id, category_id, name, description, price, is_available)
values
  ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 'Fresh Orange Juice', 'Freshly pressed orange juice.', 28, true),
  ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 'Mint Tea', 'Traditional Moroccan mint tea.', 18, true),
  ('44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', 'Chicken Shawarma Plate', 'Served with fries and salad.', 72, true),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', 'Beef Burger', 'Beef patty, cheese, lettuce, tomato.', 68, true),
  ('44444444-4444-4444-4444-444444444445', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Chocolate Mousse', 'Rich chocolate mousse.', 34, true),
  ('44444444-4444-4444-4444-44444444a101', '11111111-1111-1111-1111-111111111112', '33333333-3333-3333-3333-33333334a101', 'Espresso', 'Double shot.', 22, true),
  ('44444444-4444-4444-4444-44444444a102', '11111111-1111-1111-1111-111111111112', '33333333-3333-3333-3333-33333334a102', 'Avocado toast', 'Sourdough, eggs optional.', 55, true),
  ('44444444-4444-4444-4444-44444444b101', '11111111-1111-1111-1111-111111111113', '33333333-3333-3333-3333-33333334b101', 'House cocktail', 'Ask your server.', 75, true),
  ('44444444-4444-4444-4444-44444444b102', '11111111-1111-1111-1111-111111111113', '33333333-3333-3333-3333-33333334b102', 'Sharing board', 'Cheese, charcuterie, pickles.', 120, true);

insert into admin_users (id, restaurant_id, email, password_hash, role)
values
  ('55555555-5555-5555-5555-555555555550', null, 'owner@zilo.ma', 'owner123', 'super_admin'),
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'admin@zilo.ma', 'admin123', 'restaurant_admin');

-- 7. Row Level Security (open for MVP)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON restaurants FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON restaurant_tables FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON menu_categories FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON menu_items FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE table_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON table_orders FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON order_items FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON payments FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON reviews FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON admin_users FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE waiter_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON waiter_requests FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE kitchen_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON kitchen_orders FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE kitchen_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON kitchen_order_items FOR ALL USING (true) WITH CHECK (true);

-- Realtime for admin dashboard (Supabase hosted)
alter publication supabase_realtime add table waiter_requests;
alter publication supabase_realtime add table kitchen_orders;
