-- Super admin (company owner): can set tier per restaurant; restaurant_id may be null.
-- Restaurant admin: scoped to one restaurant; cannot change guest_order_mode via API.

alter table admin_users alter column restaurant_id drop not null;

alter table admin_users
  add column if not exists role text not null default 'restaurant_admin'
  check (role in ('super_admin', 'restaurant_admin'));

alter table admin_users drop constraint if exists admin_users_role_scope_chk;

alter table admin_users add constraint admin_users_role_scope_chk check (
  (role = 'super_admin')
  or (role = 'restaurant_admin' and restaurant_id is not null)
);
