-- Migration 018: Add 'admin' role for app technical administrator
--
-- Hugo Cano (IT admin) is NOT court staff — he manages the application
-- but does not participate in guard assignments or court operations.
-- A dedicated 'admin' role separates his access from 'headmaster' (court head)
-- while granting the same technical privileges.

-- 1. Add 'admin' to the role CHECK constraint
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('headmaster', 'worker', 'admin'));

-- 2. Assign admin role to the IT administrator
UPDATE staff SET role = 'admin' WHERE email = 'hugocanolou@gmail.com';

-- 3. Update get_my_role() so existing RLS policies treat 'admin' = 'headmaster'
--    This keeps all 14+ existing policies working without modification.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN role IN ('headmaster', 'admin') THEN 'headmaster'
      ELSE role
    END
  FROM public.staff
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- 4. Backfill corrected staff surnames confirmed by the administrator
UPDATE staff SET last_name = 'Ruano',  updated_at = NOW() WHERE email = 'belen.test@juzgado-tarazona.local';
UPDATE staff SET last_name = 'Ochoa',  updated_at = NOW() WHERE email = 'cristina.test@juzgado-tarazona.local';
UPDATE staff SET last_name = 'Ainaga', updated_at = NOW() WHERE email = 'irene.test@juzgado-tarazona.local';
UPDATE staff SET last_name = 'Alonso', updated_at = NOW() WHERE email = 'iris.test@juzgado-tarazona.local';
UPDATE staff SET last_name = 'García', updated_at = NOW() WHERE email = 'rociogarpin@hotmail.com';
