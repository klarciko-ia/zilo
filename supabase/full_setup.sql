-- ============================================
-- FULL SETUP: Drop everything, recreate, seed
-- Run this ONCE in a clean Supabase SQL editor
-- ============================================

-- 1. Drop tables
DROP TABLE IF EXISTS admin_users CASCADE;
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

-- 3. Create tables and types
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  google_review_url text not null,
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
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- 4. Indexes
create index idx_restaurant_tables_restaurant on restaurant_tables(restaurant_id);
create index idx_menu_items_restaurant on menu_items(restaurant_id);
create index idx_menu_items_category on menu_items(category_id);
create index idx_orders_table on table_orders(table_id);
create index idx_order_items_order on order_items(order_id);
create index idx_payments_order on payments(order_id);
create index idx_reviews_restaurant on reviews(restaurant_id);

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

-- 6. Seed data
insert into restaurants (id, name, google_review_url)
values ('11111111-1111-1111-1111-111111111111', 'Zilo Cafe', 'https://g.page/r/example-review-link');

insert into restaurant_tables (id, restaurant_id, table_number, qr_slug)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 1, '1'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2, '2'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 3, '3');

insert into menu_categories (id, restaurant_id, name, sort_order)
values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Drinks', 1),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Food', 2),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Desserts', 3);

insert into menu_items (id, restaurant_id, category_id, name, description, price, is_available)
values
  ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 'Fresh Orange Juice', 'Freshly pressed orange juice.', 28, true),
  ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 'Mint Tea', 'Traditional Moroccan mint tea.', 18, true),
  ('44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', 'Chicken Shawarma Plate', 'Served with fries and salad.', 72, true),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', 'Beef Burger', 'Beef patty, cheese, lettuce, tomato.', 68, true),
  ('44444444-4444-4444-4444-444444444445', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Chocolate Mousse', 'Rich chocolate mousse.', 34, true);

insert into admin_users (id, restaurant_id, email, password_hash)
values ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'admin@zilo.ma', 'admin123');

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
