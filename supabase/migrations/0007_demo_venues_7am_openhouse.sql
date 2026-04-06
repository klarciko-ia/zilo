-- Optional: add 7AM + Open House demo venues (if not already seeded).
-- Safe to run multiple times (ON CONFLICT DO NOTHING on primary keys).

insert into restaurants (id, name, google_review_url, venue_flow, guest_order_mode)
values
  ('11111111-1111-1111-1111-111111111112', '7AM', 'https://g.page/r/example-review-link', 'dine_in', 'self_service'),
  ('11111111-1111-1111-1111-111111111113', 'Open House', 'https://g.page/r/example-review-link', 'dine_in', 'waiter_service')
on conflict (id) do nothing;

insert into restaurant_tables (id, restaurant_id, table_number, qr_slug)
values
  ('22222222-2222-2222-2222-222222223001', '11111111-1111-1111-1111-111111111112', 1, '7am-1'),
  ('22222222-2222-2222-2222-222222223002', '11111111-1111-1111-1111-111111111112', 2, '7am-2'),
  ('22222222-2222-2222-2222-222222223011', '11111111-1111-1111-1111-111111111113', 1, 'openhouse-1'),
  ('22222222-2222-2222-2222-222222223012', '11111111-1111-1111-1111-111111111113', 2, 'openhouse-2')
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
