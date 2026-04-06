-- Add currency to restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

-- Update role constraint to include restaurant_staff
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('super_admin', 'restaurant_owner', 'restaurant_admin', 'restaurant_staff'));
