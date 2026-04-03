-- Seed data for local MVP testing.

insert into restaurants (id, name, google_review_url)
values
  ('11111111-1111-1111-1111-111111111111', 'Zilo Cafe', 'https://g.page/r/example-review-link')
on conflict (id) do nothing;

insert into restaurant_tables (id, restaurant_id, table_number, qr_slug)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 1, '1'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2, '2'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 3, '3')
on conflict (id) do nothing;

insert into menu_categories (id, restaurant_id, name, sort_order)
values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Drinks', 1),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Food', 2),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Desserts', 3)
on conflict (id) do nothing;

insert into menu_items (id, restaurant_id, category_id, name, description, price, is_available)
values
  ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 'Fresh Orange Juice', 'Freshly pressed orange juice.', 28, true),
  ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 'Mint Tea', 'Traditional Moroccan mint tea.', 18, true),
  ('44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', 'Chicken Shawarma Plate', 'Served with fries and salad.', 72, true),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', 'Beef Burger', 'Beef patty, cheese, lettuce, tomato.', 68, true),
  ('44444444-4444-4444-4444-444444444445', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Chocolate Mousse', 'Rich chocolate mousse.', 34, true)
on conflict (id) do nothing;

insert into admin_users (id, restaurant_id, email, password_hash)
values
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'admin@zilo.ma', 'admin123')
on conflict (id) do nothing;
