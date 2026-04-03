-- Core MVP schema for QR restaurant ordering and payment.

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  google_review_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_number int not null,
  qr_slug text not null unique,
  created_at timestamptz not null default now(),
  unique (restaurant_id, table_number)
);

create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table if not exists menu_items (
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
create type payment_status as enum (
  'pending',
  'completed',
  'failed',
  'pending_cash_confirm'
);

create table if not exists table_orders (
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

create table if not exists order_items (
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

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references table_orders(id) on delete cascade,
  payment_type payment_type not null,
  payment_method payment_method not null,
  amount numeric(10,2) not null check (amount > 0),
  status payment_status not null default 'pending',
  external_reference text,
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid references table_orders(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  feedback_text text,
  redirected_to_google boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_restaurant_tables_restaurant on restaurant_tables(restaurant_id);
create index if not exists idx_menu_items_restaurant on menu_items(restaurant_id);
create index if not exists idx_menu_items_category on menu_items(category_id);
create index if not exists idx_orders_table on table_orders(table_id);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_payments_order on payments(order_id);
create index if not exists idx_reviews_restaurant on reviews(restaurant_id);
