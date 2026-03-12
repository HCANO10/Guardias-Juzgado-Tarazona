-- supabase/migrations/012_cleanup_staff_and_roles.sql
ALTER TABLE staff ADD COLUMN IF NOT EXISTS second_last_name text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role text DEFAULT 'worker' CHECK (role IN ('headmaster', 'worker'));
ALTER TABLE staff ADD COLUMN IF NOT EXISTS notes text;
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
UPDATE staff SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;
UPDATE staff SET first_name = TRIM(first_name), last_name = TRIM(last_name), second_last_name = TRIM(second_last_name) WHERE first_name IS NOT NULL;
UPDATE staff SET last_name = SPLIT_PART(first_name, ' ', 2), first_name = SPLIT_PART(first_name, ' ', 1) WHERE (last_name IS NULL OR last_name = '') AND first_name LIKE '% %';
UPDATE staff SET last_name = '(pendiente)' WHERE last_name IS NULL OR last_name = '';
UPDATE staff SET first_name = '(pendiente)' WHERE first_name IS NULL OR first_name = '';
UPDATE staff SET is_active = true WHERE is_active IS NULL;
UPDATE staff SET start_date = created_at::date WHERE start_date IS NULL;
UPDATE staff s SET auth_user_id = au.id FROM auth.users au WHERE LOWER(TRIM(au.email)) = LOWER(TRIM(s.email)) AND (s.auth_user_id IS NULL OR s.auth_user_id != au.id);
UPDATE staff SET role = 'headmaster' WHERE email = 'hugocanolou@gmail.com';
UPDATE staff SET role = 'worker' WHERE role IS NULL;
CREATE OR REPLACE FUNCTION staff_full_name(staff_row staff) RETURNS text AS $$ BEGIN RETURN TRIM(COALESCE(staff_row.first_name, '') || ' ' || COALESCE(staff_row.last_name, '') || ' ' || COALESCE(staff_row.second_last_name, '')); END; $$ LANGUAGE plpgsql IMMUTABLE;
