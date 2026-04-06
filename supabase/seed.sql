-- Seed data for local MVP testing.
-- Image URLs sourced from Unsplash (free to use with attribution).

insert into restaurants (id, name, google_review_url, venue_flow, guest_order_mode)
values
  ('11111111-1111-1111-1111-111111111111', 'Zilo Cafe', 'https://g.page/r/example-review-link', 'dine_in', 'self_service'),
  ('11111111-1111-1111-1111-111111111112', '7AM', 'https://g.page/r/example-review-link', 'dine_in', 'self_service'),
  ('11111111-1111-1111-1111-111111111113', 'Open House', 'https://g.page/r/example-review-link', 'dine_in', 'waiter_service')
on conflict (id) do nothing;

insert into restaurant_tables (id, restaurant_id, table_number, qr_slug)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 1, '1'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2, '2'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 3, '3'),
  ('22222222-2222-2222-2222-222222223001', '11111111-1111-1111-1111-111111111112', 1, '7am-1'),
  ('22222222-2222-2222-2222-222222223002', '11111111-1111-1111-1111-111111111112', 2, '7am-2'),
  ('22222222-2222-2222-2222-222222223011', '11111111-1111-1111-1111-111111111113', 1, 'openhouse-1'),
  ('22222222-2222-2222-2222-222222223012', '11111111-1111-1111-1111-111111111113', 2, 'openhouse-2')
on conflict (id) do nothing;

insert into menu_categories (id, restaurant_id, name, sort_order)
values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Drinks', 1),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Food', 2),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Desserts', 3),
  ('33333333-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111111', 'Shisha', 4)
on conflict (id) do nothing;

insert into menu_items (id, restaurant_id, category_id, name, description, price, is_available, image_url)
values
  ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 'Fresh Orange Juice', 'Freshly pressed orange juice.', 28, true, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=400&fit=crop&q=80'),
  ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 'Mint Tea', 'Traditional Moroccan mint tea.', 18, true, 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400&h=400&fit=crop&q=80'),
  ('44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', 'Chicken Shawarma Plate', 'Served with fries and salad.', 72, true, 'https://images.unsplash.com/photo-1561651188-d207bbec4ec3?w=400&h=400&fit=crop&q=80'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', 'Beef Burger', 'Beef patty, cheese, lettuce, tomato.', 68, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop&q=80'),
  ('44444444-4444-4444-4444-444444444445', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Chocolate Mousse', 'Rich chocolate mousse.', 34, true, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop&q=80'),
  ('44444444-4444-4444-4444-444444444446', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333334', 'Double Apple Shisha', 'Classic double apple flavor, smooth and aromatic.', 90, true, 'https://images.unsplash.com/photo-1516733968668-dbdce39c0651?w=400&h=400&fit=crop&q=80'),
  ('44444444-4444-4444-4444-444444444447', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333334', 'Mint Shisha', 'Refreshing cool mint flavor.', 90, true, 'https://images.unsplash.com/photo-1528938102132-4a9276b8e320?w=400&h=400&fit=crop&q=80'),
  ('44444444-4444-4444-4444-444444444448', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333334', 'Grape Shisha', 'Sweet grape with a rich finish.', 90, true, 'https://images.unsplash.com/photo-1496524455197-d7f846dcb852?w=400&h=400&fit=crop&q=80'),
  ('44444444-4444-4444-4444-444444444449', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333334', 'Lemon Mint Shisha', 'Zesty lemon blended with cool mint.', 95, true, 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=400&h=400&fit=crop&q=80'),
  ('44444444-4444-4444-4444-44444444444a', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333334', 'Blueberry Shisha', 'Sweet wild blueberry, smooth smoke.', 95, true, 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=400&h=400&fit=crop&q=80'),
  ('44444444-4444-4444-4444-44444444444b', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333334', 'Premium Hookah Setup', 'Large hookah with premium tobacco blend of your choice.', 150, true, 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=400&h=400&fit=crop&q=80')
on conflict (id) do nothing;

insert into menu_categories (id, restaurant_id, name, sort_order)
values
  ('33333333-3333-3333-3333-33333334a101', '11111111-1111-1111-1111-111111111112', 'Coffee & drinks', 1),
  ('33333333-3333-3333-3333-33333334a102', '11111111-1111-1111-1111-111111111112', 'Breakfast', 2),
  ('33333333-3333-3333-3333-33333334b101', '11111111-1111-1111-1111-111111111113', 'Bar', 1),
  ('33333333-3333-3333-3333-33333334b102', '11111111-1111-1111-1111-111111111113', 'Small plates', 2)
on conflict (id) do nothing;

insert into menu_items (id, restaurant_id, category_id, name, description, price, is_available, image_url)
values
  ('44444444-4444-4444-4444-44444444a101', '11111111-1111-1111-1111-111111111112', '33333333-3333-3333-3333-33333334a101', 'Espresso', 'Double shot.', 22, true, 'https://images.unsplash.com/photo-1510591509098-f4fdc6d47666?w=400&h=400&fit=crop&q=80'),
  ('44444444-4444-4444-4444-44444444a102', '11111111-1111-1111-1111-111111111112', '33333333-3333-3333-3333-33333334a102', 'Avocado toast', 'Sourdough, eggs optional.', 55, true, 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&h=400&fit=crop&q=80'),
  ('44444444-4444-4444-4444-44444444b101', '11111111-1111-1111-1111-111111111113', '33333333-3333-3333-3333-33333334b101', 'House cocktail', 'Ask your server.', 75, true, 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop&q=80'),
  ('44444444-4444-4444-4444-44444444b102', '11111111-1111-1111-1111-111111111113', '33333333-3333-3333-3333-33333334b102', 'Sharing board', 'Cheese, charcuterie, pickles.', 120, true, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop&q=80')
on conflict (id) do nothing;

-- Requires migration 0006_admin_roles.sql (nullable restaurant_id + role).
insert into admin_users (id, restaurant_id, email, password_hash, role)
values
  ('55555555-5555-5555-5555-555555555550', null, 'owner@zilo.ma', 'owner123', 'super_admin'),
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'admin@zilo.ma', 'admin123', 'restaurant_admin')
on conflict (id) do update set
  restaurant_id = excluded.restaurant_id,
  email = excluded.email,
  password_hash = excluded.password_hash,
  role = excluded.role;
